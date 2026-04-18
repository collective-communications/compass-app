// AUTO-COPIED from packages/scoring/src. Edit the canonical source, then re-run scripts/sync-scoring.sh.
export { normalizeAnswer } from './normalize.ts';
export { calculateDimensionScore, calculateAllDimensionScores } from './dimension-score.ts';
export { calculateSubDimensionScores } from './sub-dimension-score.ts';
export { classifyCoreHealth } from './core-health.ts';
export { computeSurveyScores } from './pipeline.ts';
export { ScoringError } from './errors.ts';
export { SCORE_DECIMALS, buildScoringConstants } from './constants.ts';
/**
 * @deprecated `LIKERT_MIN`, `LIKERT_MAX`, and `LIKERT_RANGE` are hardcoded to
 * the legacy 4-point Likert scale. Use {@link buildScoringConstants} with the
 * survey's configured `likertSize` (from `survey_settings.likertSize`) so the
 * scoring pipeline adapts to 5-point and future scales. See
 * `_adrs/adr-005-likert4-legacy-type-retention.md`.
 */
export { LIKERT_MIN, LIKERT_MAX, LIKERT_RANGE } from './constants.ts';

export type { ScoringConstants } from './constants.ts';

export type {
  DimensionCode,
  DimensionScore,
  DimensionScoreMap,
  CoreHealthStatus,
  SurveyScoreResult,
  AnswerWithMeta,
  SubDimensionScore,
} from './types.ts';

export type { ScoringErrorCode } from './errors.ts';

export {
  euclideanDistance,
  distanceToConfidence,
  identifyArchetype,
  CONFIDENCE_STRONG,
  CONFIDENCE_MODERATE,
} from './archetype.ts';
export { ARCHETYPE_VECTORS } from './archetypes.ts';
export { evaluateRiskFlags, DEFAULT_RISK_THRESHOLDS } from './risk-flags.ts';

export type { ArchetypeVector, ArchetypeMatch } from './archetype-types.ts';
export type { RiskSeverity, RiskFlag, RiskThresholds } from './risk-types.ts';

export { SEGMENT_TYPES, OVERALL_SEGMENT, segmentKey, groupResponsesBySegment, computeSegmentedScores } from './segments.ts';

export { calculateTrustLadderPosition } from './trust-ladder.ts';

export type { TrustRungStatus, TrustRungScore, TrustLadderResult } from './trust-ladder.ts';

export type {
  SegmentType,
  SegmentTypeWithOverall,
  Segment,
  SegmentScoreResult,
  SegmentedSurveyResult,
  ResponseWithMeta,
} from './segment-types.ts';
