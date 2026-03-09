import { describe, expect, test } from 'bun:test';
import { normalizeAnswer } from './normalize.js';
import { ScoringError } from './errors.js';

describe('normalizeAnswer', () => {
  test('returns value unchanged when not reverse scored', () => {
    expect(normalizeAnswer(1, false)).toBe(1);
    expect(normalizeAnswer(2, false)).toBe(2);
    expect(normalizeAnswer(3, false)).toBe(3);
    expect(normalizeAnswer(4, false)).toBe(4);
  });

  test('reverses value when reverse scored (5 - value)', () => {
    expect(normalizeAnswer(1, true)).toBe(4);
    expect(normalizeAnswer(2, true)).toBe(3);
    expect(normalizeAnswer(3, true)).toBe(2);
    expect(normalizeAnswer(4, true)).toBe(1);
  });

  test('throws on value below minimum', () => {
    expect(() => normalizeAnswer(0, false)).toThrow(ScoringError);
    expect(() => normalizeAnswer(-1, false)).toThrow(ScoringError);
  });

  test('throws on value above maximum', () => {
    expect(() => normalizeAnswer(5, false)).toThrow(ScoringError);
    expect(() => normalizeAnswer(100, false)).toThrow(ScoringError);
  });

  test('throws on non-integer value', () => {
    expect(() => normalizeAnswer(1.5, false)).toThrow(ScoringError);
    expect(() => normalizeAnswer(2.1, true)).toThrow(ScoringError);
  });

  test('throws on NaN', () => {
    expect(() => normalizeAnswer(NaN, false)).toThrow(ScoringError);
  });

  test('error has correct code', () => {
    try {
      normalizeAnswer(0, false);
    } catch (e) {
      expect(e).toBeInstanceOf(ScoringError);
      expect((e as ScoringError).code).toBe('INVALID_LIKERT_VALUE');
    }
  });

  test('boundary values 1 and 4 are valid', () => {
    expect(normalizeAnswer(1, false)).toBe(1);
    expect(normalizeAnswer(4, false)).toBe(4);
  });
});
