import { describe, expect, test } from 'bun:test';
import { calculateDimensionScore, calculateAllDimensionScores } from './dimension-score.js';
import { ScoringError } from './errors.js';
import type { AnswerWithMeta, DimensionCode } from './types.js';

function makeAnswer(overrides: Partial<AnswerWithMeta> = {}): AnswerWithMeta {
  return {
    questionId: 'q1',
    value: 3,
    reverseScored: false,
    dimensionId: 'dim-core',
    dimensionCode: 'core',
    weight: 1,
    ...overrides,
  };
}

describe('calculateDimensionScore', () => {
  test('single answer with weight 1', () => {
    const result = calculateDimensionScore('dim-1', 'core', [makeAnswer({ value: 4 })]);
    // rawScore = 4, score = ((4-1)/3)*100 = 100
    expect(result.score).toBe(100);
    expect(result.rawScore).toBe(4);
    expect(result.responseCount).toBe(1);
    expect(result.dimensionId).toBe('dim-1');
    expect(result.dimensionCode).toBe('core');
  });

  test('minimum value yields score 0', () => {
    const result = calculateDimensionScore('dim-1', 'core', [makeAnswer({ value: 1 })]);
    expect(result.score).toBe(0);
    expect(result.rawScore).toBe(1);
  });

  test('weighted average of multiple answers', () => {
    const answers = [
      makeAnswer({ value: 4, weight: 2 }),
      makeAnswer({ value: 2, weight: 1 }),
    ];
    // weightedAvg = (4*2 + 2*1) / (2+1) = 10/3 ≈ 3.33
    const result = calculateDimensionScore('dim-1', 'clarity', answers);
    expect(result.rawScore).toBeCloseTo(3.33, 1);
    // score = ((3.33 - 1) / 3) * 100 ≈ 77.78
    expect(result.score).toBeCloseTo(77.78, 0);
  });

  test('reverse scored answers are normalized', () => {
    const result = calculateDimensionScore('dim-1', 'core', [
      makeAnswer({ value: 1, reverseScored: true }),
    ]);
    // normalized = 5-1 = 4, rawScore = 4, score = 100
    expect(result.score).toBe(100);
  });

  test('throws EMPTY_ANSWERS on empty array', () => {
    expect(() => calculateDimensionScore('dim-1', 'core', [])).toThrow(ScoringError);
    try {
      calculateDimensionScore('dim-1', 'core', []);
    } catch (e) {
      expect((e as ScoringError).code).toBe('EMPTY_ANSWERS');
    }
  });

  test('throws INVALID_WEIGHT on zero weight', () => {
    expect(() =>
      calculateDimensionScore('dim-1', 'core', [makeAnswer({ weight: 0 })]),
    ).toThrow(ScoringError);
    try {
      calculateDimensionScore('dim-1', 'core', [makeAnswer({ weight: 0 })]);
    } catch (e) {
      expect((e as ScoringError).code).toBe('INVALID_WEIGHT');
    }
  });

  test('throws INVALID_WEIGHT on negative weight', () => {
    expect(() =>
      calculateDimensionScore('dim-1', 'core', [makeAnswer({ weight: -1 })]),
    ).toThrow(ScoringError);
  });

  test('equal weights produce simple average', () => {
    const answers = [
      makeAnswer({ value: 2, weight: 1 }),
      makeAnswer({ value: 4, weight: 1 }),
    ];
    const result = calculateDimensionScore('dim-1', 'core', answers);
    expect(result.rawScore).toBe(3);
    // ((3-1)/3)*100 = 66.67
    expect(result.score).toBeCloseTo(66.67, 1);
  });
});

describe('calculateAllDimensionScores', () => {
  const dims: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

  function makeFullAnswers(): AnswerWithMeta[] {
    return dims.map((code) =>
      makeAnswer({ dimensionCode: code, dimensionId: `dim-${code}`, value: 3 }),
    );
  }

  test('returns scores for all four dimensions', () => {
    const result = calculateAllDimensionScores(makeFullAnswers());
    for (const code of dims) {
      expect(result[code]).toBeDefined();
      expect(result[code].dimensionCode).toBe(code);
    }
  });

  test('throws MISSING_DIMENSION when a dimension has no answers', () => {
    const answers = makeFullAnswers().filter((a) => a.dimensionCode !== 'collaboration');
    expect(() => calculateAllDimensionScores(answers)).toThrow(ScoringError);
    try {
      calculateAllDimensionScores(answers);
    } catch (e) {
      expect((e as ScoringError).code).toBe('MISSING_DIMENSION');
    }
  });
});
