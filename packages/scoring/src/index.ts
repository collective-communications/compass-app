export { normalizeAnswer } from './normalize.js';
export { calculateDimensionScore, calculateAllDimensionScores } from './dimension-score.js';
export { classifyCoreHealth } from './core-health.js';
export { computeSurveyScores } from './pipeline.js';
export { ScoringError } from './errors.js';
export { LIKERT_MIN, LIKERT_MAX, LIKERT_RANGE, SCORE_DECIMALS } from './constants.js';

export type {
  DimensionCode,
  DimensionScore,
  DimensionScoreMap,
  CoreHealthStatus,
  SurveyScoreResult,
  AnswerWithMeta,
} from './types.js';

export type { ScoringErrorCode } from './errors.js';

export { euclideanDistance, distanceToConfidence, identifyArchetype } from './archetype.js';
export { evaluateRiskFlags, DEFAULT_RISK_THRESHOLDS } from './risk-flags.js';

export type { ArchetypeVector, ArchetypeMatch } from './archetype-types.js';
export type { RiskSeverity, RiskFlag, RiskThresholds } from './risk-types.js';

export { SEGMENT_TYPES, OVERALL_SEGMENT, segmentKey, groupResponsesBySegment, computeSegmentedScores } from './segments.js';

export type {
  SegmentType,
  SegmentTypeWithOverall,
  Segment,
  SegmentScoreResult,
  SegmentedSurveyResult,
  ResponseWithMeta,
} from './segment-types.js';
