import { ScoringError } from './errors.js';

/**
 * Normalize a Likert answer, applying reverse scoring when needed.
 * Reverse formula: `(scaleSize + 1) - value`.
 *
 * @param value - Raw Likert response (integer 1–scaleSize).
 * @param reverseScored - Whether this question is reverse-scored.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 * @throws ScoringError if value is outside the 1–scaleSize range.
 */
export function normalizeAnswer(
  value: number,
  reverseScored: boolean,
  scaleSize: number = 4,
): number {
  if (!Number.isInteger(value) || value < 1 || value > scaleSize) {
    throw new ScoringError(
      'INVALID_LIKERT_VALUE',
      `Likert value must be an integer between 1 and ${scaleSize}, got ${value}`,
    );
  }

  return reverseScored ? scaleSize + 1 - value : value;
}
