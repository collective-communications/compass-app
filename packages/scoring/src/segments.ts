import { calculateAllDimensionScores } from './dimension-score.js';
import { ScoringError } from './errors.js';
import type { AnswerWithMeta } from './types.js';
import type {
  Segment,
  SegmentType,
  SegmentScoreResult,
  SegmentedSurveyResult,
  ResponseWithMeta,
} from './segment-types.js';

/** The four segment types used for demographic breakdown. */
export const SEGMENT_TYPES: SegmentType[] = ['department', 'role', 'location', 'tenure'];

/** Sentinel segment representing the overall aggregate. */
export const OVERALL_SEGMENT: Segment = { type: 'overall', value: 'all' };

/** Produce a stable string key for a segment, suitable for Map keys. */
export function segmentKey(segment: Segment): string {
  return `${segment.type}:${segment.value}`;
}

/**
 * Group all response answers by segment.
 *
 * Each response contributes its answers to the overall bucket plus one
 * bucket per segment type (department, role, location, tenure).
 * Key format: "type:value" e.g. "department:Engineering", "overall:all".
 *
 * @throws ScoringError on empty responses, missing metadata fields, or empty segment values.
 */
export function groupResponsesBySegment(
  responses: readonly ResponseWithMeta[],
): Map<string, AnswerWithMeta[]> {
  if (responses.length === 0) {
    throw new ScoringError('EMPTY_ANSWERS', 'No responses provided for segment grouping');
  }

  const groups = new Map<string, AnswerWithMeta[]>();
  const overallKey = segmentKey(OVERALL_SEGMENT);
  groups.set(overallKey, []);

  for (const response of responses) {
    // Validate metadata
    for (const segType of SEGMENT_TYPES) {
      const val = response.metadata[segType];
      if (val === undefined || val === null) {
        throw new ScoringError(
          'MISSING_DIMENSION',
          `Response "${response.responseId}" is missing metadata field "${segType}"`,
        );
      }
      if (val.trim() === '') {
        throw new ScoringError(
          'MISSING_DIMENSION',
          `Response "${response.responseId}" has empty value for metadata field "${segType}"`,
        );
      }
    }

    // Add answers to overall
    const overall = groups.get(overallKey)!;
    overall.push(...response.answers);

    // Add answers to each segment bucket
    for (const segType of SEGMENT_TYPES) {
      const val = response.metadata[segType];
      const key = `${segType}:${val}`;
      let bucket = groups.get(key);
      if (!bucket) {
        bucket = [];
        groups.set(key, bucket);
      }
      bucket.push(...response.answers);
    }
  }

  return groups;
}

/**
 * Compute dimension scores for every segment in a survey.
 *
 * Groups responses by demographic segments and the overall aggregate,
 * then runs `calculateAllDimensionScores` on each group.
 * Anonymity thresholds are NOT enforced here — the `safe_segment_scores`
 * Postgres view handles that concern.
 *
 * @param surveyId - UUID of the survey being scored.
 * @param responses - Respondent answer sets with demographic metadata.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 * @throws ScoringError on empty responses, missing metadata, or scoring failures.
 */
export function computeSegmentedScores(
  surveyId: string,
  responses: readonly ResponseWithMeta[],
  scaleSize: number = 4,
): SegmentedSurveyResult {
  const groups = groupResponsesBySegment(responses);
  const overallKey = segmentKey(OVERALL_SEGMENT);

  // Count respondents per segment (not answers)
  const respondentCounts = new Map<string, number>();
  respondentCounts.set(overallKey, responses.length);
  for (const response of responses) {
    for (const segType of SEGMENT_TYPES) {
      const key = `${segType}:${response.metadata[segType]}`;
      respondentCounts.set(key, (respondentCounts.get(key) ?? 0) + 1);
    }
  }

  const overallAnswers = groups.get(overallKey)!;
  const overallResult: SegmentScoreResult = {
    segment: OVERALL_SEGMENT,
    scores: calculateAllDimensionScores(overallAnswers, scaleSize),
    responseCount: responses.length,
  };

  const segments: SegmentScoreResult[] = [];

  for (const [key, answers] of groups) {
    if (key === overallKey) continue;

    const [type, ...valueParts] = key.split(':');
    const value = valueParts.join(':');
    const segment: Segment = {
      type: type as SegmentType,
      value,
    };

    segments.push({
      segment,
      scores: calculateAllDimensionScores(answers, scaleSize),
      responseCount: respondentCounts.get(key) ?? 0,
    });
  }

  return {
    surveyId,
    overall: overallResult,
    segments,
    calculatedAt: new Date().toISOString(),
  };
}
