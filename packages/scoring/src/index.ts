export { normalizeAnswer } from './normalize.js';
export { calculateDimensionScore, calculateAllDimensionScores } from './dimension-score.js';
export { calculateSubDimensionScores } from './sub-dimension-score.js';
export { classifyCoreHealth } from './core-health.js';
export { computeSurveyScores } from './pipeline.js';
export { ScoringError } from './errors.js';
export { SCORE_DECIMALS, buildScoringConstants } from './constants.js';
import {
  LIKERT_MIN as _LIKERT_MIN,
  LIKERT_MAX as _LIKERT_MAX,
  LIKERT_RANGE as _LIKERT_RANGE,
} from './constants.js';

/**
 * @deprecated Hardcoded to the legacy 4-point Likert scale. Use
 * {@link buildScoringConstants} with the survey's configured `likertSize`
 * (from `survey_settings.likertSize`). See
 * `_adrs/adr-005-likert4-legacy-type-retention.md`.
 */
export const LIKERT_MIN = _LIKERT_MIN;

/**
 * @deprecated Hardcoded to the legacy 4-point Likert scale. Use
 * {@link buildScoringConstants} with the survey's configured `likertSize`
 * (from `survey_settings.likertSize`). See
 * `_adrs/adr-005-likert4-legacy-type-retention.md`.
 */
export const LIKERT_MAX = _LIKERT_MAX;

/**
 * @deprecated Hardcoded to the legacy 4-point Likert scale. Use
 * {@link buildScoringConstants} with the survey's configured `likertSize`
 * (from `survey_settings.likertSize`). See
 * `_adrs/adr-005-likert4-legacy-type-retention.md`.
 */
export const LIKERT_RANGE = _LIKERT_RANGE;

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

export {
  euclideanDistance,
  distanceToConfidence,
  identifyArchetype,
  CONFIDENCE_STRONG,
  CONFIDENCE_MODERATE,
} from './archetype.js';
export { ARCHETYPE_VECTORS } from './archetypes.js';
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
