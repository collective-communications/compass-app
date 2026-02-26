/** Dimension code identifiers matching the four compass dimensions. */
export type DimensionCode = 'core' | 'clarity' | 'connection' | 'collaboration';

/** Scored result for a single dimension. */
export interface DimensionScore {
  dimensionId: string;
  dimensionCode: DimensionCode;
  /** 0-100 percentage, 2 decimal places. */
  score: number;
  /** 1-4 weighted average, 2 decimal places. */
  rawScore: number;
  responseCount: number;
}

/** Map of dimension codes to their scored results. */
export type DimensionScoreMap = Record<DimensionCode, DimensionScore>;

/** Overall health classification for the Core dimension. */
export type CoreHealthStatus = 'healthy' | 'fragile' | 'broken';

/** Full scoring result for a survey. */
export interface SurveyScoreResult {
  surveyId: string;
  overallScores: DimensionScoreMap;
  coreHealth: CoreHealthStatus;
  /** ISO 8601 timestamp. */
  calculatedAt: string;
}

/** A single survey answer with scoring metadata. */
export interface AnswerWithMeta {
  questionId: string;
  /** 1-4 raw Likert value. */
  value: number;
  reverseScored: boolean;
  dimensionId: string;
  dimensionCode: DimensionCode;
  /** Default 1.0. */
  weight: number;
}
