import { describe, expect, test } from 'bun:test';
import { calculateSubDimensionScores } from './sub-dimension-score.js';
import type { AnswerWithMeta } from './types.js';

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

describe('calculateSubDimensionScores', () => {
  test('returns empty array when no answers have subDimensionCode', () => {
    const answers = [
      makeAnswer({ value: 3 }),
      makeAnswer({ value: 4, questionId: 'q2' }),
    ];
    const result = calculateSubDimensionScores(answers);
    expect(result).toEqual([]);
  });

  test('returns empty array for empty input', () => {
    expect(calculateSubDimensionScores([])).toEqual([]);
  });

  test('groups answers by subDimensionCode', () => {
    const answers = [
      makeAnswer({ value: 4, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 2, subDimensionCode: 'trust', questionId: 'q2' }),
      makeAnswer({ value: 3, subDimensionCode: 'safety', questionId: 'q3' }),
    ];
    const result = calculateSubDimensionScores(answers);
    expect(result).toHaveLength(2);

    const trust = result.find((s) => s.subDimensionCode === 'trust');
    const safety = result.find((s) => s.subDimensionCode === 'safety');
    expect(trust).toBeDefined();
    expect(safety).toBeDefined();
    expect(trust!.responseCount).toBe(2);
    expect(safety!.responseCount).toBe(1);
  });

  test('calculates correct scores on 4-point scale', () => {
    const answers = [
      makeAnswer({ value: 4, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 4, subDimensionCode: 'trust', questionId: 'q2' }),
    ];
    const result = calculateSubDimensionScores(answers, 4);
    const trust = result.find((s) => s.subDimensionCode === 'trust')!;
    // rawScore = 4, score = ((4-1)/3)*100 = 100
    expect(trust.rawScore).toBe(4);
    expect(trust.score).toBe(100);
  });

  test('calculates correct scores on 5-point scale', () => {
    const answers = [
      makeAnswer({ value: 3, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 3, subDimensionCode: 'trust', questionId: 'q2' }),
    ];
    const result = calculateSubDimensionScores(answers, 5);
    const trust = result.find((s) => s.subDimensionCode === 'trust')!;
    // rawScore = 3, score = ((3-1)/4)*100 = 50
    expect(trust.rawScore).toBe(3);
    expect(trust.score).toBe(50);
  });

  test('all answers = 5 on 5-point → 100% per sub-dimension', () => {
    const answers = [
      makeAnswer({ value: 5, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 5, subDimensionCode: 'trust', questionId: 'q2' }),
    ];
    const result = calculateSubDimensionScores(answers, 5);
    expect(result[0]!.score).toBe(100);
  });

  test('all answers = 1 on 5-point → 0% per sub-dimension', () => {
    const answers = [
      makeAnswer({ value: 1, subDimensionCode: 'safety', questionId: 'q1' }),
    ];
    const result = calculateSubDimensionScores(answers, 5);
    expect(result[0]!.score).toBe(0);
  });

  test('skips answers without subDimensionCode', () => {
    const answers = [
      makeAnswer({ value: 4, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 2, questionId: 'q2' }), // no subDimensionCode
    ];
    const result = calculateSubDimensionScores(answers);
    expect(result).toHaveLength(1);
    expect(result[0]!.subDimensionCode).toBe('trust');
  });

  test('preserves dimensionCode from answers', () => {
    const answers = [
      makeAnswer({
        value: 3,
        subDimensionCode: 'vision',
        dimensionCode: 'clarity',
        questionId: 'q1',
      }),
    ];
    const result = calculateSubDimensionScores(answers, 5);
    expect(result[0]!.dimensionCode).toBe('clarity');
  });

  test('results are sorted by dimensionCode then subDimensionCode', () => {
    const answers = [
      makeAnswer({ value: 3, subDimensionCode: 'z-sub', dimensionCode: 'core', questionId: 'q1' }),
      makeAnswer({ value: 3, subDimensionCode: 'a-sub', dimensionCode: 'core', questionId: 'q2' }),
      makeAnswer({ value: 3, subDimensionCode: 'b-sub', dimensionCode: 'clarity', questionId: 'q3' }),
    ];
    const result = calculateSubDimensionScores(answers, 4);
    expect(result.map((s) => s.subDimensionCode)).toEqual(['b-sub', 'a-sub', 'z-sub']);
  });

  test('weighted answers produce correct sub-dimension score', () => {
    const answers = [
      makeAnswer({ value: 4, weight: 2, subDimensionCode: 'trust', questionId: 'q1' }),
      makeAnswer({ value: 2, weight: 1, subDimensionCode: 'trust', questionId: 'q2' }),
    ];
    const result = calculateSubDimensionScores(answers, 4);
    const trust = result.find((s) => s.subDimensionCode === 'trust')!;
    // weightedAvg = (4*2 + 2*1) / 3 = 10/3 ≈ 3.33
    expect(trust.rawScore).toBeCloseTo(3.33, 1);
    // score = ((3.33 - 1) / 3) * 100 ≈ 77.78
    expect(trust.score).toBeCloseTo(77.78, 0);
  });
});
