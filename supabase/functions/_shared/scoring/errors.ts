/** Error codes for scoring pipeline failures. */
export type ScoringErrorCode =
  | 'INVALID_LIKERT_VALUE'
  | 'EMPTY_ANSWERS'
  | 'INVALID_WEIGHT'
  | 'MISSING_DIMENSION'
  | 'INVALID_SCORE'
  | 'EMPTY_ARCHETYPES';

/** Typed error for scoring pipeline failures. */
export class ScoringError extends Error {
  readonly code: ScoringErrorCode;

  constructor(code: ScoringErrorCode, message: string) {
    super(message);
    this.name = 'ScoringError';
    this.code = code;
  }
}
