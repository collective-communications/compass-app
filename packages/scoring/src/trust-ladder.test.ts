import { describe, expect, test } from 'bun:test';
import { calculateTrustLadderPosition } from './trust-ladder.js';
import type { DimensionScoreMap, DimensionScore } from './types.js';

function makeDimensionScore(code: string, rawScore: number): DimensionScore {
  return {
    dimensionId: code,
    dimensionCode: code as DimensionScore['dimensionCode'],
    score: ((rawScore - 1) / 3) * 100,
    rawScore,
    responseCount: 10,
  };
}

function makeScoreMap(scores: { core: number; clarity: number; connection: number; collaboration: number }): DimensionScoreMap {
  return {
    core: makeDimensionScore('core', scores.core),
    clarity: makeDimensionScore('clarity', scores.clarity),
    connection: makeDimensionScore('connection', scores.connection),
    collaboration: makeDimensionScore('collaboration', scores.collaboration),
  };
}

describe('calculateTrustLadderPosition', () => {
  test('all dimensions score 3.5 → all rungs achieved, currentLevel = 9', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 3.5, clarity: 3.5, connection: 3.5, collaboration: 3.5 }),
    );

    expect(result.rungs).toHaveLength(9);
    for (const rung of result.rungs) {
      expect(rung.status).toBe('achieved');
      expect(rung.score).toBe(3.5);
      expect(rung.maxScore).toBe(4);
    }
    expect(result.currentLevel).toBe(9);
    expect(result.nextActions).toEqual([]);
  });

  test('all dimensions score 1.5 → all rungs not_started, currentLevel = 0', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 1.5, clarity: 1.5, connection: 1.5, collaboration: 1.5 }),
    );

    for (const rung of result.rungs) {
      expect(rung.status).toBe('not_started');
    }
    expect(result.currentLevel).toBe(0);
    expect(result.nextActions).toEqual(['Purpose', 'Values']);
  });

  test('mixed scores: core=3.5, clarity=2.5, connection=1.5, collaboration=1.5', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 3.5, clarity: 2.5, connection: 1.5, collaboration: 1.5 }),
    );

    // Rungs 1–2 (core) → achieved
    expect(result.rungs[0]!.status).toBe('achieved');
    expect(result.rungs[1]!.status).toBe('achieved');

    // Rungs 3–5 (clarity) → in_progress
    expect(result.rungs[2]!.status).toBe('in_progress');
    expect(result.rungs[3]!.status).toBe('in_progress');
    expect(result.rungs[4]!.status).toBe('in_progress');

    // Rungs 6–7 (connection) → not_started
    expect(result.rungs[5]!.status).toBe('not_started');
    expect(result.rungs[6]!.status).toBe('not_started');

    // Rungs 8–9 (collaboration) → not_started
    expect(result.rungs[7]!.status).toBe('not_started');
    expect(result.rungs[8]!.status).toBe('not_started');

    expect(result.currentLevel).toBe(2);
    expect(result.nextActions).toEqual(['Mission / Vision', 'Strategic Priorities']);
  });

  test('edge case: exactly 3.0 rawScore → achieved', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 3.0, clarity: 3.0, connection: 3.0, collaboration: 3.0 }),
    );

    for (const rung of result.rungs) {
      expect(rung.status).toBe('achieved');
    }
    expect(result.currentLevel).toBe(9);
  });

  test('edge case: exactly 2.0 rawScore → in_progress', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 2.0, clarity: 2.0, connection: 2.0, collaboration: 2.0 }),
    );

    for (const rung of result.rungs) {
      expect(rung.status).toBe('in_progress');
    }
    expect(result.currentLevel).toBe(0);
    expect(result.nextActions).toEqual(['Purpose', 'Values']);
  });

  test('rung names and dimension codes are correct', () => {
    const result = calculateTrustLadderPosition(
      makeScoreMap({ core: 3.0, clarity: 3.0, connection: 3.0, collaboration: 3.0 }),
    );

    expect(result.rungs[0]).toMatchObject({ rung: 1, name: 'Purpose', dimensionCode: 'core' });
    expect(result.rungs[4]).toMatchObject({ rung: 5, name: 'Role Clarification', dimensionCode: 'clarity' });
    expect(result.rungs[8]).toMatchObject({ rung: 9, name: 'Career / Growth', dimensionCode: 'collaboration' });
  });
});
