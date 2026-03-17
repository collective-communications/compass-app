import { describe, expect, test } from 'bun:test';
import { buildScoringConstants } from './constants.js';

describe('buildScoringConstants', () => {
  test('returns correct constants for 4-point scale', () => {
    const result = buildScoringConstants(4);
    expect(result).toEqual({ min: 1, max: 4, range: 3, decimals: 2 });
  });

  test('returns correct constants for 5-point scale', () => {
    const result = buildScoringConstants(5);
    expect(result).toEqual({ min: 1, max: 5, range: 4, decimals: 2 });
  });

  test('returns correct constants for 7-point scale', () => {
    const result = buildScoringConstants(7);
    expect(result).toEqual({ min: 1, max: 7, range: 6, decimals: 2 });
  });

  test('min is always 1', () => {
    for (const size of [3, 4, 5, 6, 7, 10]) {
      expect(buildScoringConstants(size).min).toBe(1);
    }
  });
});
