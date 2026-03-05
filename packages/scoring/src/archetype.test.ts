import { describe, expect, test } from 'bun:test';
import { euclideanDistance, distanceToConfidence, identifyArchetype } from './archetype.js';
import { ScoringError } from './errors.js';
import type { ArchetypeVector } from './archetype-types.js';
import type { DimensionScoreMap, DimensionScore } from './types.js';

function makeDimScore(code: string, score: number): DimensionScore {
  return { dimensionId: `dim-${code}`, dimensionCode: code as any, score, rawScore: 1, responseCount: 1 };
}

function makeScores(values: Record<string, number>): DimensionScoreMap {
  return {
    core: makeDimScore('core', values['core'] ?? 50),
    clarity: makeDimScore('clarity', values['clarity'] ?? 50),
    connection: makeDimScore('connection', values['connection'] ?? 50),
    collaboration: makeDimScore('collaboration', values['collaboration'] ?? 50),
  };
}

function makeArchetype(overrides: Partial<ArchetypeVector> = {}): ArchetypeVector {
  return {
    id: 'arch-1',
    code: 'balanced',
    name: 'Balanced',
    description: 'A balanced archetype',
    targetScores: { core: 75, clarity: 75, connection: 75, collaboration: 75 },
    displayOrder: 1,
    ...overrides,
  };
}

describe('euclideanDistance', () => {
  test('identical vectors have distance 0', () => {
    expect(euclideanDistance({ a: 10, b: 20 }, { a: 10, b: 20 })).toBe(0);
  });

  test('calculates distance correctly', () => {
    // sqrt((3-0)^2 + (4-0)^2) = 5
    expect(euclideanDistance({ a: 3, b: 4 }, { a: 0, b: 0 })).toBe(5);
  });

  test('missing keys in scores default to 0', () => {
    expect(euclideanDistance({}, { a: 3, b: 4 })).toBe(5);
  });

  test('single dimension', () => {
    expect(euclideanDistance({ x: 10 }, { x: 20 })).toBe(10);
  });

  test('symmetric', () => {
    const a = { x: 10, y: 20 };
    const b = { x: 30, y: 40 };
    expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a), 10);
  });
});

describe('distanceToConfidence', () => {
  test('distance < 15 is strong', () => {
    expect(distanceToConfidence(0)).toBe('strong');
    expect(distanceToConfidence(14.99)).toBe('strong');
  });

  test('distance exactly 15 is moderate', () => {
    expect(distanceToConfidence(15)).toBe('moderate');
  });

  test('distance < 25 is moderate', () => {
    expect(distanceToConfidence(24.99)).toBe('moderate');
  });

  test('distance exactly 25 is weak', () => {
    expect(distanceToConfidence(25)).toBe('weak');
  });

  test('large distance is weak', () => {
    expect(distanceToConfidence(100)).toBe('weak');
  });
});

describe('identifyArchetype', () => {
  test('throws EMPTY_ARCHETYPES on empty array', () => {
    expect(() => identifyArchetype(makeScores({}), [])).toThrow(ScoringError);
    try {
      identifyArchetype(makeScores({}), []);
    } catch (e) {
      expect((e as ScoringError).code).toBe('EMPTY_ARCHETYPES');
    }
  });

  test('selects closest archetype', () => {
    const close = makeArchetype({ id: 'close', targetScores: { core: 50, clarity: 50, connection: 50, collaboration: 50 }, displayOrder: 1 });
    const far = makeArchetype({ id: 'far', targetScores: { core: 100, clarity: 100, connection: 100, collaboration: 100 }, displayOrder: 2 });
    const result = identifyArchetype(makeScores({ core: 50, clarity: 50, connection: 50, collaboration: 50 }), [far, close]);
    expect(result.archetype.id).toBe('close');
    expect(result.distance).toBe(0);
    expect(result.confidence).toBe('strong');
  });

  test('tiebreaks by displayOrder (lower wins)', () => {
    const a = makeArchetype({ id: 'a', targetScores: { core: 50 }, displayOrder: 2 });
    const b = makeArchetype({ id: 'b', targetScores: { core: 50 }, displayOrder: 1 });
    const result = identifyArchetype(makeScores({ core: 50, clarity: 50, connection: 50, collaboration: 50 }), [a, b]);
    expect(result.archetype.id).toBe('b');
  });

  test('single archetype is always selected', () => {
    const arch = makeArchetype();
    const result = identifyArchetype(makeScores({}), [arch]);
    expect(result.archetype.id).toBe('arch-1');
  });
});
