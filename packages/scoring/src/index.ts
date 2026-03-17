export { normalizeAnswer } from './normalize.js';
export { calculateDimensionScore, calculateAllDimensionScores } from './dimension-score.js';
export { calculateSubDimensionScores } from './sub-dimension-score.js';
export { classifyCoreHealth } from './core-health.js';
export { computeSurveyScores } from './pipeline.js';
export { ScoringError } from './errors.js';
export { LIKERT_MIN, LIKERT_MAX, LIKERT_RANGE, SCORE_DECIMALS, buildScoringConstants } from './constants.js';

export type { ScoringConstants } from './constants.js';

export type {
  DimensionCode,
  DimensionScore,
  DimensionScoreMap,
  CoreHealthStatus,
  SurveyScoreResult,
  AnswerWithMeta,
  SubDimensionScore,
} from './types.js';

export type { ScoringErrorCode } from './errors.js';

export { euclideanDistance, distanceToConfidence, identifyArchetype } from './archetype.js';
export { evaluateRiskFlags, DEFAULT_RISK_THRESHOLDS } from './risk-flags.js';

export type { ArchetypeVector, ArchetypeMatch } from './archetype-types.js';
export type { RiskSeverity, RiskFlag, RiskThresholds } from './risk-types.js';

export { SEGMENT_TYPES, OVERALL_SEGMENT, segmentKey, groupResponsesBySegment, computeSegmentedScores } from './segments.js';

export { calculateTrustLadderPosition } from './trust-ladder.js';

export type { TrustRungStatus, TrustRungScore, TrustLadderResult } from './trust-ladder.js';

export type {
  SegmentType,
  SegmentTypeWithOverall,
  Segment,
  SegmentScoreResult,
  SegmentedSurveyResult,
  ResponseWithMeta,
} from './segment-types.js';
