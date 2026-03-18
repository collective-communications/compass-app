/**
 * score-survey — Supabase Edge Function
 *
 * Scores all completed responses for a survey: calculates dimension scores,
 * sub-dimension scores, archetype matching, and segmented breakdowns, then
 * persists results to the database.
 *
 * HTTP Method: POST
 *
 * Request body:
 *   {
 *     "surveyId": string,         // UUID of the survey to score
 *     "reason":   string           // Optional trigger reason (default: "manual")
 *   }
 *
 * Requires: Authorization header with a valid Supabase access token.
 *
 * Success response (200):
 *   {
 *     "surveyId": string,
 *     "status":   "completed",
 *     "metrics": {
 *       "responsesProcessed": number,
 *       "segmentsScored":     number,
 *       "scoreRowsInserted":  number,
 *       "skippedAnswers":     number,
 *       "calculatedAt":       string,  // ISO 8601 timestamp
 *       "likertSize":         number
 *     },
 *     "coreHealth":          "healthy" | "fragile" | "broken" | undefined,
 *     "archetype":           { code: string, name: string, distance: number, confidence: string } | undefined,
 *     "subDimensionScores":  Array<{ subDimensionCode: string, dimensionCode: string, score: number, rawScore: number, responseCount: number }>
 *   }
 *
 * Error responses:
 *   400 — INVALID_REQUEST  (missing or invalid surveyId)
 *   404 — NOT_FOUND        (survey does not exist)
 *   405 — METHOD_NOT_ALLOWED
 *   409 — CONFLICT         (another recalculation is already in progress)
 *   422 — NO_RESPONSES     (no completed responses found)
 *   500 — SCORING_FAILED   (recalculation marked "failed" on error)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';
import {
  loadCompletedResponses,
  loadQuestionMetadata,
  loadArchetypes,
  loadSurveySettings,
  checkConcurrency,
  insertRecalculation,
  completeRecalculation,
  upsertScores,
  markSurveyScored,
  surveyExists,
} from './db.ts';
import type { ResponseRow, QuestionMeta, ArchetypeRow, ScoreInsert } from './db.ts';

// ─── Inline Scoring Logic ──────────────────────────────────────────────────
// Replicated from @compass/scoring to avoid Deno workspace import issues.
// These are pure math functions with no dependencies.

const SCORE_DECIMALS = 2;

type DimensionCode = 'core' | 'clarity' | 'connection' | 'collaboration';
const DIMENSION_CODES: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

type SegmentType = 'department' | 'role' | 'location' | 'tenure';
const SEGMENT_TYPES: SegmentType[] = ['department', 'role', 'location', 'tenure'];

interface AnswerWithMeta {
  questionId: string;
  value: number;
  reverseScored: boolean;
  dimensionId: string;
  dimensionCode: DimensionCode;
  weight: number;
  subDimensionCode?: string;
}

interface DimensionScore {
  dimensionId: string;
  dimensionCode: DimensionCode;
  score: number;
  rawScore: number;
  responseCount: number;
}

type DimensionScoreMap = Record<DimensionCode, DimensionScore>;

interface SegmentScoreResult {
  segmentType: string;
  segmentValue: string;
  scores: DimensionScoreMap;
  responseCount: number;
}

interface SubDimensionScore {
  subDimensionCode: string;
  dimensionCode: DimensionCode;
  score: number;
  rawScore: number;
  responseCount: number;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Normalize a Likert answer, applying reverse scoring when needed. */
function normalizeAnswer(value: number, reverseScored: boolean, scaleSize: number): number {
  return reverseScored ? scaleSize + 1 - value : value;
}

/** Calculate dimension score from a set of weighted, normalized answers. */
function calculateDimensionScore(
  dimensionId: string,
  dimensionCode: DimensionCode,
  answers: readonly AnswerWithMeta[],
  scaleSize: number,
): DimensionScore {
  const range = scaleSize - 1;
  let weightedSum = 0;
  let weightSum = 0;

  for (const answer of answers) {
    const normalized = normalizeAnswer(answer.value, answer.reverseScored, scaleSize);
    weightedSum += normalized * answer.weight;
    weightSum += answer.weight;
  }

  const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
  const score = roundTo(((rawScore - 1) / range) * 100, SCORE_DECIMALS);

  return { dimensionId, dimensionCode, score, rawScore, responseCount: answers.length };
}

/** Calculate scores for all four dimensions from grouped answers. */
function calculateAllDimensionScores(
  groups: Map<DimensionCode, AnswerWithMeta[]>,
  scaleSize: number,
): DimensionScoreMap {
  const result = {} as DimensionScoreMap;

  for (const code of DIMENSION_CODES) {
    const answers = groups.get(code);
    if (!answers || answers.length === 0) {
      throw new Error(`No answers found for dimension "${code}"`);
    }
    result[code] = calculateDimensionScore(answers[0].dimensionId, code, answers, scaleSize);
  }

  return result;
}

/** Calculate sub-dimension scores from all answers. */
function calculateSubDimensionScores(
  answers: AnswerWithMeta[],
  scaleSize: number,
): SubDimensionScore[] {
  const groups = new Map<string, { dimensionCode: DimensionCode; answers: AnswerWithMeta[] }>();

  for (const answer of answers) {
    if (!answer.subDimensionCode) continue;
    let group = groups.get(answer.subDimensionCode);
    if (!group) {
      group = { dimensionCode: answer.dimensionCode, answers: [] };
      groups.set(answer.subDimensionCode, group);
    }
    group.answers.push(answer);
  }

  const range = scaleSize - 1;
  const results: SubDimensionScore[] = [];

  for (const [code, group] of groups) {
    let weightedSum = 0;
    let weightSum = 0;

    for (const answer of group.answers) {
      const normalized = normalizeAnswer(answer.value, answer.reverseScored, scaleSize);
      weightedSum += normalized * answer.weight;
      weightSum += answer.weight;
    }

    const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
    const score = roundTo(((rawScore - 1) / range) * 100, SCORE_DECIMALS);

    results.push({
      subDimensionCode: code,
      dimensionCode: group.dimensionCode,
      score,
      rawScore,
      responseCount: group.answers.length,
    });
  }

  return results;
}

/** Euclidean distance between observed dimension scores and an archetype target. */
function euclideanDistance(
  scores: Record<string, number>,
  target: Record<string, number>,
): number {
  let sumSquared = 0;
  for (const key of Object.keys(target)) {
    const a = scores[key] ?? 0;
    const b = target[key];
    sumSquared += (a - b) ** 2;
  }
  return Math.sqrt(sumSquared);
}

/** Classify core dimension health. */
function classifyCoreHealth(coreScore: number): 'healthy' | 'fragile' | 'broken' {
  if (coreScore > 70) return 'healthy';
  if (coreScore >= 50) return 'fragile';
  return 'broken';
}

// ─── Pipeline Helpers ──────────────────────────────────────────────────────

/** Build a lookup map from question ID to its scoring metadata (supports multi-dimension). */
function buildQuestionLookup(
  questions: QuestionMeta[],
): Map<string, QuestionMeta[]> {
  const lookup = new Map<string, QuestionMeta[]>();
  for (const q of questions) {
    let entries = lookup.get(q.questionId);
    if (!entries) {
      entries = [];
      lookup.set(q.questionId, entries);
    }
    entries.push(q);
  }
  return lookup;
}

/**
 * Transform raw DB responses into AnswerWithMeta arrays grouped by response,
 * then group all answers by segment (overall + demographics).
 */
function buildSegmentGroups(
  responses: ResponseRow[],
  questionLookup: Map<string, QuestionMeta[]>,
  scaleSize: number,
): { segments: Map<string, { answers: Map<DimensionCode, AnswerWithMeta[]>; allAnswers: AnswerWithMeta[]; responseCount: number }>; skippedAnswers: number } {
  const segments = new Map<string, { answers: Map<DimensionCode, AnswerWithMeta[]>; allAnswers: AnswerWithMeta[]; responseCount: number }>();
  let skippedAnswers = 0;

  function ensureSegment(key: string): { answers: Map<DimensionCode, AnswerWithMeta[]>; allAnswers: AnswerWithMeta[]; responseCount: number } {
    let seg = segments.get(key);
    if (!seg) {
      seg = { answers: new Map(), allAnswers: [], responseCount: 0 };
      segments.set(key, seg);
    }
    return seg;
  }

  function addAnswerToSegment(
    segKey: string,
    answer: AnswerWithMeta,
  ): void {
    const seg = ensureSegment(segKey);
    let dimAnswers = seg.answers.get(answer.dimensionCode);
    if (!dimAnswers) {
      dimAnswers = [];
      seg.answers.set(answer.dimensionCode, dimAnswers);
    }
    dimAnswers.push(answer);
    seg.allAnswers.push(answer);
  }

  for (const response of responses) {
    // Increment response counts for all applicable segments
    const overallSeg = ensureSegment('overall:all');
    overallSeg.responseCount++;

    for (const segType of SEGMENT_TYPES) {
      const segValue = response.metadata[segType];
      if (segValue) {
        const seg = ensureSegment(`${segType}:${segValue}`);
        seg.responseCount++;
      }
    }

    // Process each answer in the response
    for (const [questionId, value] of Object.entries(response.answers)) {
      const metas = questionLookup.get(questionId);
      if (!metas) {
        skippedAnswers++;
        continue;
      }

      // A question can map to multiple dimensions (many-to-many)
      for (const meta of metas) {
        if (typeof value !== 'number' || value < 1 || value > scaleSize) {
          skippedAnswers++;
          continue;
        }

        const answer: AnswerWithMeta = {
          questionId,
          value,
          reverseScored: meta.reverseScored,
          dimensionId: meta.dimensionId,
          dimensionCode: meta.dimensionCode as DimensionCode,
          weight: meta.weight,
          subDimensionCode: meta.subDimensionCode,
        };

        // Add to overall
        addAnswerToSegment('overall:all', answer);

        // Add to each demographic segment
        for (const segType of SEGMENT_TYPES) {
          const segValue = response.metadata[segType];
          if (segValue) {
            addAnswerToSegment(`${segType}:${segValue}`, answer);
          }
        }
      }
    }
  }

  return { segments, skippedAnswers };
}

/** Flatten segment scores into ScoreInsert rows for the database. */
function flattenToScoreRows(
  surveyId: string,
  segmentResults: SegmentScoreResult[],
  calculatedAt: string,
): ScoreInsert[] {
  const rows: ScoreInsert[] = [];

  for (const seg of segmentResults) {
    for (const code of DIMENSION_CODES) {
      const dim = seg.scores[code];
      rows.push({
        survey_id: surveyId,
        dimension_id: dim.dimensionId,
        segment_type: seg.segmentType,
        segment_value: seg.segmentValue,
        score: dim.score,
        raw_score: dim.rawScore,
        response_count: seg.responseCount,
        calculated_at: calculatedAt,
      });
    }
  }

  return rows;
}

// ─── JSON Response Helpers ─────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST requests are accepted', 405);
  }

  // Parse request body
  let surveyId: string;
  let reason: string;
  try {
    const body = await req.json();
    surveyId = body.surveyId;
    reason = body.reason ?? 'manual';

    if (!surveyId || typeof surveyId !== 'string') {
      return errorResponse('INVALID_REQUEST', 'surveyId is required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON with surveyId', 400);
  }

  // Create Supabase client with service_role for full access
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize the caller
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult.result;

  let recalcId: string | undefined;

  try {
    // Verify survey exists
    const exists = await surveyExists(client, surveyId);
    if (!exists) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

    // Concurrency check
    const concurrency = await checkConcurrency(client, surveyId);
    if (concurrency.blocked) {
      return errorResponse(
        'CONFLICT',
        'A score recalculation is already running for this survey',
        409,
      );
    }

    // Start recalculation tracking
    recalcId = await insertRecalculation(client, surveyId, userId, reason);

    // Load data (including survey settings for likertSize)
    const [responses, questions, archetypes, settings] = await Promise.all([
      loadCompletedResponses(client, surveyId),
      loadQuestionMetadata(client, surveyId),
      loadArchetypes(client),
      loadSurveySettings(client, surveyId),
    ]);

    // Determine Likert scale size from survey settings (default 4 for backward compat)
    const likertSize: number = settings?.likertSize ?? 4;

    if (responses.length === 0) {
      await completeRecalculation(client, recalcId, 'failed');
      return errorResponse(
        'NO_RESPONSES',
        'No completed responses found for this survey',
        422,
      );
    }

    // Build question lookup and segment groups
    const questionLookup = buildQuestionLookup(questions);
    const { segments, skippedAnswers } = buildSegmentGroups(responses, questionLookup, likertSize);

    // Score each segment
    const calculatedAt = new Date().toISOString();
    const segmentResults: SegmentScoreResult[] = [];

    // Collect all overall answers for sub-dimension scoring
    let overallAllAnswers: AnswerWithMeta[] = [];

    for (const [key, segData] of segments) {
      const [segType, ...valueParts] = key.split(':');
      const segValue = valueParts.join(':');

      if (segType === 'overall' && segValue === 'all') {
        overallAllAnswers = segData.allAnswers;
      }

      try {
        const scores = calculateAllDimensionScores(segData.answers, likertSize);
        segmentResults.push({
          segmentType: segType,
          segmentValue: segValue,
          scores,
          responseCount: segData.responseCount,
        });
      } catch {
        // Skip segments that lack answers for all four dimensions
        // (e.g. a segment with only 1 respondent who skipped some questions)
        continue;
      }
    }

    // Calculate sub-dimension scores from overall answers
    const subDimensionScores = calculateSubDimensionScores(overallAllAnswers, likertSize);

    // Identify archetype from overall scores
    const overallResult = segmentResults.find(
      (s) => s.segmentType === 'overall' && s.segmentValue === 'all',
    );

    let archetypeMatch: { code: string; name: string; distance: number; confidence: string } | undefined;
    if (overallResult && archetypes.length > 0) {
      const scoreMap: Record<string, number> = {};
      for (const code of DIMENSION_CODES) {
        scoreMap[code] = overallResult.scores[code].score;
      }

      let bestArchetype: ArchetypeRow | undefined;
      let bestDistance = Infinity;
      for (const arch of archetypes) {
        const dist = euclideanDistance(scoreMap, arch.target_vectors);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestArchetype = arch;
        }
      }

      if (bestArchetype) {
        const confidence = bestDistance < 15 ? 'strong' : bestDistance < 25 ? 'moderate' : 'weak';
        archetypeMatch = {
          code: bestArchetype.code,
          name: bestArchetype.name,
          distance: roundTo(bestDistance, SCORE_DECIMALS),
          confidence,
        };
      }
    }

    // Core health
    const coreHealth = overallResult
      ? classifyCoreHealth(overallResult.scores.core.score)
      : undefined;

    // Persist scores
    const scoreRows = flattenToScoreRows(surveyId, segmentResults, calculatedAt);
    await upsertScores(client, surveyId, scoreRows);
    await markSurveyScored(client, surveyId);

    // Complete recalculation
    await completeRecalculation(client, recalcId, 'completed');

    return jsonResponse({
      surveyId,
      status: 'completed',
      metrics: {
        responsesProcessed: responses.length,
        segmentsScored: segmentResults.length,
        scoreRowsInserted: scoreRows.length,
        skippedAnswers,
        calculatedAt,
        likertSize,
      },
      coreHealth,
      archetype: archetypeMatch,
      subDimensionScores,
    });
  } catch (err) {
    // Mark recalculation as failed if we started one
    if (recalcId) {
      try {
        await completeRecalculation(client, recalcId, 'failed');
      } catch {
        // Best-effort cleanup; the stale timeout will catch this
      }
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('SCORING_FAILED', message, 500);
  }
});
