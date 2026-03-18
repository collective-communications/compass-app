import { describe, expect, test } from 'bun:test';
import { ScoringError } from './errors.js';
import type { ScoringErrorCode } from './errors.js';

describe('ScoringError', () => {
  test('constructor sets code and message', () => {
    const err = new ScoringError('EMPTY_ANSWERS', 'No answers provided');

    expect(err.code).toBe('EMPTY_ANSWERS');
    expect(err.message).toBe('No answers provided');
  });

  test('instanceof Error is true', () => {
    const err = new ScoringError('INVALID_LIKERT_VALUE', 'Value out of range');

    expect(err instanceof Error).toBe(true);
    expect(err instanceof ScoringError).toBe(true);
  });

  test('name property is ScoringError', () => {
    const err = new ScoringError('MISSING_DIMENSION', 'Dimension not found');

    expect(err.name).toBe('ScoringError');
  });

  test('each error code can be used', () => {
    const codes: ScoringErrorCode[] = [
      'INVALID_LIKERT_VALUE',
      'EMPTY_ANSWERS',
      'INVALID_WEIGHT',
      'MISSING_DIMENSION',
      'INVALID_SCORE',
      'EMPTY_ARCHETYPES',
    ];

    for (const code of codes) {
      const err = new ScoringError(code, `Test message for ${code}`);
      expect(err.code).toBe(code);
      expect(err.message).toBe(`Test message for ${code}`);
      expect(err.name).toBe('ScoringError');
    }
  });
});
