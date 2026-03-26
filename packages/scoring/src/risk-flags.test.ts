import { describe, expect, test } from 'bun:test';
import { evaluateRiskFlags, DEFAULT_RISK_THRESHOLDS } from './risk-flags.js';
import type { DimensionCode, DimensionScoreMap, DimensionScore } from './types.js';

function makeDimScore(code: string, score: number): DimensionScore {
  return { dimensionId: `dim-${code}`, dimensionCode: code as DimensionCode, score, rawScore: 1, responseCount: 1 };
}

function makeScores(values: Partial<Record<string, number>> = {}): DimensionScoreMap {
  return {
    core: makeDimScore('core', values['core'] ?? 80),
    clarity: makeDimScore('clarity', values['clarity'] ?? 80),
    connection: makeDimScore('connection', values['connection'] ?? 80),
    collaboration: makeDimScore('collaboration', values['collaboration'] ?? 80),
  };
}

describe('evaluateRiskFlags', () => {
  test('all healthy returns empty array', () => {
    expect(evaluateRiskFlags(makeScores())).toEqual([]);
  });

  test('core below 50 triggers critical flag', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 40 }));
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags[0].severity).toBe('critical');
    expect(flags[0].dimensionCode).toBe('core');
  });

  test('core between 50-70 triggers medium flag', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 60 }));
    expect(flags.some((f) => f.severity === 'medium' && f.dimensionCode === 'core')).toBe(true);
  });

  test('core exactly 50 triggers medium flag (>= 50, <= 70)', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 50 }));
    expect(flags.some((f) => f.severity === 'medium' && f.dimensionCode === 'core')).toBe(true);
  });

  test('core exactly 70 triggers medium flag', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 70 }));
    expect(flags.some((f) => f.severity === 'medium' && f.dimensionCode === 'core')).toBe(true);
  });

  test('core at 71 (above 70) produces no flags', () => {
    expect(evaluateRiskFlags(makeScores({ core: 71 }))).toEqual([]);
  });

  test('dimension below 40 triggers high flag', () => {
    const flags = evaluateRiskFlags(makeScores({ clarity: 30 }));
    expect(flags.some((f) => f.severity === 'high' && f.dimensionCode === 'clarity')).toBe(true);
  });

  test('core critical skips core high flag (no duplicate)', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 30 }));
    const coreFlags = flags.filter((f) => f.dimensionCode === 'core');
    expect(coreFlags).toHaveLength(1);
    expect(coreFlags[0].severity).toBe('critical');
  });

  test('flags are sorted by severity (critical first)', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 40, clarity: 30 }));
    expect(flags[0].severity).toBe('critical');
    expect(flags[1].severity).toBe('high');
  });

  test('custom thresholds are respected', () => {
    const flags = evaluateRiskFlags(makeScores({ core: 55 }), {
      coreCritical: 60,
      dimensionHigh: 40,
      coreMedium: 70,
    });
    expect(flags[0].severity).toBe('critical');
  });

  test('defaults match DEFAULT_RISK_THRESHOLDS', () => {
    expect(DEFAULT_RISK_THRESHOLDS).toEqual({
      coreCritical: 50,
      dimensionHigh: 40,
      coreMedium: 70,
    });
  });

  test('empty score map returns empty array', () => {
    expect(evaluateRiskFlags({} as DimensionScoreMap)).toEqual([]);
  });

  test('partial score map without core evaluates present dimensions', () => {
    const partial = {
      clarity: makeDimScore('clarity', 30),
    } as unknown as DimensionScoreMap;
    const flags = evaluateRiskFlags(partial);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('high');
    expect(flags[0].dimensionCode).toBe('clarity');
  });
});
