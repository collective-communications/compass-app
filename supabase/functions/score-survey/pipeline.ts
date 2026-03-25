/**
 * Data transformation pipeline for the score-survey edge function.
 * Transforms raw DB responses into scored segment groups and flattened rows.
 */

import {
  DIMENSION_CODES,
  SEGMENT_TYPES,
  type DimensionCode,
  type AnswerWithMeta,
  type SegmentScoreResult,
} from './types.ts';
import type { ResponseRow, QuestionMeta, ScoreInsert } from './db.ts';

/** Build a lookup map from question ID to its scoring metadata (supports multi-dimension). */
export function buildQuestionLookup(
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
export function buildSegmentGroups(
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
export function flattenToScoreRows(
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
