import type { DimensionScoreMap, AnswerWithMeta } from './types.js';

/** Segment categories for demographic breakdown. */
export type SegmentType = 'department' | 'role' | 'location' | 'tenure';

/** Segment categories including the overall aggregate. */
export type SegmentTypeWithOverall = SegmentType | 'overall';

/** Identifies a specific segment (e.g. department:Engineering). */
export interface Segment {
  type: SegmentTypeWithOverall;
  /** Segment value, or 'all' for the overall aggregate. */
  value: string;
}

/** Dimension scores for a single segment. */
export interface SegmentScoreResult {
  segment: Segment;
  scores: DimensionScoreMap;
  responseCount: number;
}

/** Full segmented scoring output for a survey. */
export interface SegmentedSurveyResult {
  surveyId: string;
  overall: SegmentScoreResult;
  segments: SegmentScoreResult[];
  /** ISO 8601 timestamp. */
  calculatedAt: string;
}

/** A respondent's full set of answers with demographic metadata. */
export interface ResponseWithMeta {
  responseId: string;
  metadata: {
    department: string;
    role: string;
    location: string;
    tenure: string;
  };
  answers: AnswerWithMeta[];
}
