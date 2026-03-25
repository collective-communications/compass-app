/**
 * Shared types and constants for the score-survey edge function.
 * Replicated from @compass/scoring to avoid Deno workspace import issues.
 */

export const SCORE_DECIMALS = 2;

export type DimensionCode = 'core' | 'clarity' | 'connection' | 'collaboration';
export const DIMENSION_CODES: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

export type SegmentType = 'department' | 'role' | 'location' | 'tenure';
export const SEGMENT_TYPES: SegmentType[] = ['department', 'role', 'location', 'tenure'];

export interface AnswerWithMeta {
  questionId: string;
  value: number;
  reverseScored: boolean;
  dimensionId: string;
  dimensionCode: DimensionCode;
  weight: number;
  subDimensionCode?: string;
}

export interface DimensionScore {
  dimensionId: string;
  dimensionCode: DimensionCode;
  score: number;
  rawScore: number;
  responseCount: number;
}

export type DimensionScoreMap = Record<DimensionCode, DimensionScore>;

export interface SegmentScoreResult {
  segmentType: string;
  segmentValue: string;
  scores: DimensionScoreMap;
  responseCount: number;
}

export interface SubDimensionScore {
  subDimensionCode: string;
  dimensionCode: DimensionCode;
  score: number;
  rawScore: number;
  responseCount: number;
}
