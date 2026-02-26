import { LIKERT_MAX, LIKERT_MIN } from './constants.js';
import { ScoringError } from './errors.js';

/**
 * Normalize a Likert answer, applying reverse scoring when needed.
 * Reverse formula: (LIKERT_MAX + LIKERT_MIN - value).
 *
 * @throws ScoringError if value is outside 1-4 range.
 */
export function normalizeAnswer(value: number, reverseScored: boolean): number {
  if (!Number.isInteger(value) || value < LIKERT_MIN || value > LIKERT_MAX) {
    throw new ScoringError(
      'INVALID_LIKERT_VALUE',
      `Likert value must be an integer between ${LIKERT_MIN} and ${LIKERT_MAX}, got ${value}`,
    );
  }

  return reverseScored ? LIKERT_MAX + LIKERT_MIN - value : value;
}
