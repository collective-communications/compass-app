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
 *       "responsesProcessed":   number,
 *       "segmentsScored":       number,
 *       "scoreRowsInserted":    number,
 *       "skippedAnswers":       number,
 *       "calculatedAt":         string,  // ISO 8601 timestamp
 *       "likertSize":           number,
 *       "recommendationsWritten": number
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
  loadRecommendationTemplates,
  upsertMatchedRecommendations,
  checkConcurrency,
  insertRecalculation,
  completeRecalculation,
  upsertScores,
  markSurveyScored,
  surveyExists,
} from './db.ts';
import type { ArchetypeRow } from './db.ts';
import { matchRecommendations } from './recommendations.ts';
import { DIMENSION_CODES, type AnswerWithMeta, type SegmentScoreResult } from './types.ts';
import {
  calculateAllDimensionScores,
  calculateSubDimensionScores,
  euclideanDistance,
  classifyCoreHealth,
  CONFIDENCE_STRONG,
  CONFIDENCE_MODERATE,
} from './scoring.ts';
import { buildQuestionLookup, buildSegmentGroups, flattenToScoreRows } from './pipeline.ts';

/** Round to N decimal places using integer math; mirrors canonical scoring helper. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
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
    // Survey existence and concurrency checks are independent — fire them
    // in parallel to shave one DB round-trip off the critical path. The
    // recalculation insert below gates on the combined result.
    const [exists, concurrency] = await Promise.all([
      surveyExists(client, surveyId),
      checkConcurrency(client, surveyId),
    ]);

    if (!exists) {
      return errorResponse('NOT_FOUND', `Survey ${surveyId} not found`, 404);
    }

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
        const scores = calculateAllDimensionScores(segData.allAnswers, likertSize);
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
        const confidence =
          bestDistance < CONFIDENCE_STRONG
            ? 'strong'
            : bestDistance < CONFIDENCE_MODERATE
              ? 'moderate'
              : 'weak';
        archetypeMatch = {
          code: bestArchetype.code,
          name: bestArchetype.name,
          distance: roundTo(bestDistance, 2),
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

    // Match and persist recommendations from active templates
    let recommendationsWritten = 0;
    const templates = await loadRecommendationTemplates(client);
    if (templates.length > 0 && overallResult) {
      const { data: dimRows } = await client
        .from('dimensions')
        .select('id, code');
      const dimensionIdMap: Record<string, string> = {};
      for (const d of dimRows ?? []) {
        dimensionIdMap[d.code] = d.id;
      }

      const overallScores: Record<string, number> = {};
      for (const code of DIMENSION_CODES) {
        overallScores[code] = overallResult.scores[code].score;
      }

      const recRows = matchRecommendations(surveyId, overallScores, templates, dimensionIdMap);
      await upsertMatchedRecommendations(client, surveyId, recRows);
      recommendationsWritten = recRows.length;
    }

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
        recommendationsWritten,
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
