/** Number of decimal places for scored values. */
export const SCORE_DECIMALS = 2;

/**
 * @deprecated Use `buildScoringConstants(scaleSize).min` instead.
 * Hardcoded for the legacy 4-point Likert scale.
 */
export const LIKERT_MIN = 1;

/**
 * @deprecated Use `buildScoringConstants(scaleSize).max` instead.
 * Hardcoded for the legacy 4-point Likert scale.
 */
export const LIKERT_MAX = 4;

/**
 * @deprecated Use `buildScoringConstants(scaleSize).range` instead.
 * Hardcoded for the legacy 4-point Likert scale.
 */
export const LIKERT_RANGE = LIKERT_MAX - LIKERT_MIN; // 3

/** Scoring constants derived from a given Likert scale size. */
export interface ScoringConstants {
  readonly min: 1;
  readonly max: number;
  readonly range: number;
  readonly decimals: number;
}

/** Build scoring constants for a given Likert scale size. */
export function buildScoringConstants(scaleSize: number): ScoringConstants {
  return {
    min: 1,
    max: scaleSize,
    range: scaleSize - 1,
    decimals: SCORE_DECIMALS,
  } as const;
}
