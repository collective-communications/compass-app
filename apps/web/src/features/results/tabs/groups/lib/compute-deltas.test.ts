import { describe, expect, test } from 'bun:test';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreMap } from '@compass/scoring';
import { dimensions as dimensionTokens } from '@compass/tokens';
import type { DimensionScoreRow } from '../../../types';
import {
  computeDimensionDeltas,
  hasSubcultureDeviation,
  deriveSegmentObservations,
  findWeakestDimension,
  SUBCULTURE_DEVIATION_THRESHOLD,
} from './compute-deltas';
import type { DimensionDelta } from './compute-deltas';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeDelta(code: DimensionCode, delta: number): DimensionDelta {
  return {
    dimensionCode: code,
    label: code.charAt(0).toUpperCase() + code.slice(1),
    delta,
    segmentScore: 60 + delta,
    overallScore: 60,
  };
}

function makeSegmentRow(dim: DimensionCode, score: number): DimensionScoreRow {
  return {
    surveyId: 'test-survey',
    segmentType: 'department',
    segmentValue: 'Engineering',
    dimensionCode: dim,
    isMasked: false,
    score,
    rawScore: score / 25,
    responseCount: 30,
  };
}

function makeOverallScores(scores: Record<DimensionCode, number>): DimensionScoreMap {
  const map = {} as DimensionScoreMap;
  for (const [code, score] of Object.entries(scores)) {
    map[code as DimensionCode] = {
      dimensionId: `dim-${code}`,
      dimensionCode: code as DimensionCode,
      score,
      rawScore: score / 25,
      responseCount: 100,
    };
  }
  return map;
}

// ─── computeDimensionDeltas ─────────────────────────────────────────────────

describe('computeDimensionDeltas', () => {
  test('computes correct deltas for all 4 dimensions', () => {
    const segmentRows = [
      makeSegmentRow('core', 75),
      makeSegmentRow('clarity', 50),
      makeSegmentRow('connection', 65),
      makeSegmentRow('collaboration', 80),
    ];
    const overall = makeOverallScores({
      core: 70,
      clarity: 60,
      connection: 65,
      collaboration: 70,
    });

    const result = computeDimensionDeltas(segmentRows, overall);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      dimensionCode: 'core',
      label: 'Core',
      delta: 5,
      segmentScore: 75,
      overallScore: 70,
    });
    expect(result[1]).toEqual({
      dimensionCode: 'clarity',
      label: 'Clarity',
      delta: -10,
      segmentScore: 50,
      overallScore: 60,
    });
    expect(result[2]).toEqual({
      dimensionCode: 'connection',
      label: 'Connection',
      delta: 0,
      segmentScore: 65,
      overallScore: 65,
    });
    expect(result[3]).toEqual({
      dimensionCode: 'collaboration',
      label: 'Collaboration',
      delta: 10,
      segmentScore: 80,
      overallScore: 70,
    });
  });

  test('maintains core/clarity/connection/collaboration order', () => {
    const segmentRows = [
      makeSegmentRow('collaboration', 60),
      makeSegmentRow('core', 60),
      makeSegmentRow('connection', 60),
      makeSegmentRow('clarity', 60),
    ];
    const overall = makeOverallScores({
      core: 60,
      clarity: 60,
      connection: 60,
      collaboration: 60,
    });

    const result = computeDimensionDeltas(segmentRows, overall);

    expect(result.map((d) => d.dimensionCode)).toEqual([
      'core',
      'clarity',
      'connection',
      'collaboration',
    ]);
  });

  test('handles missing segment dimension gracefully (defaults to score 0)', () => {
    const segmentRows = [
      makeSegmentRow('core', 70),
      makeSegmentRow('clarity', 55),
      makeSegmentRow('collaboration', 65),
      // connection is missing
    ];
    const overall = makeOverallScores({
      core: 60,
      clarity: 60,
      connection: 60,
      collaboration: 60,
    });

    const result = computeDimensionDeltas(segmentRows, overall);

    expect(result).toHaveLength(4);
    const connectionDelta = result.find((d) => d.dimensionCode === 'connection')!;
    expect(connectionDelta.segmentScore).toBe(0);
    expect(connectionDelta.delta).toBe(-60);
  });

  test('handles segment rows with null scores', () => {
    const segmentRows: DimensionScoreRow[] = [
      { ...makeSegmentRow('core', 70), score: null },
      makeSegmentRow('clarity', 55),
      makeSegmentRow('connection', 60),
      makeSegmentRow('collaboration', 65),
    ];
    const overall = makeOverallScores({
      core: 60,
      clarity: 60,
      connection: 60,
      collaboration: 60,
    });

    const result = computeDimensionDeltas(segmentRows, overall);
    const coreDelta = result.find((d) => d.dimensionCode === 'core')!;
    expect(coreDelta.segmentScore).toBe(0);
    expect(coreDelta.delta).toBe(-60);
  });
});

// ─── hasSubcultureDeviation ─────────────────────────────────────────────────

describe('hasSubcultureDeviation', () => {
  test('returns deltas exceeding default threshold (10)', () => {
    const deltas = [
      makeDelta('core', 5),
      makeDelta('clarity', -15),
      makeDelta('connection', 2),
      makeDelta('collaboration', 12),
    ];

    const result = hasSubcultureDeviation(deltas);

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dimensionCode)).toEqual(['clarity', 'collaboration']);
  });

  test('returns empty array when all deltas within threshold', () => {
    const deltas = [
      makeDelta('core', 5),
      makeDelta('clarity', -8),
      makeDelta('connection', 0),
      makeDelta('collaboration', 10), // exactly 10 — not *exceeding*
    ];

    const result = hasSubcultureDeviation(deltas);

    expect(result).toHaveLength(0);
  });

  test('respects custom threshold', () => {
    const deltas = [
      makeDelta('core', 6),
      makeDelta('clarity', -7),
      makeDelta('connection', 2),
      makeDelta('collaboration', 4),
    ];

    const result = hasSubcultureDeviation(deltas, 5);

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dimensionCode)).toEqual(['core', 'clarity']);
  });

  test('includes negative deltas beyond threshold', () => {
    const deltas = [
      makeDelta('core', 0),
      makeDelta('clarity', -20),
      makeDelta('connection', -12),
      makeDelta('collaboration', 3),
    ];

    const result = hasSubcultureDeviation(deltas);

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dimensionCode)).toEqual(['clarity', 'connection']);
  });

  test('default threshold matches exported constant', () => {
    expect(SUBCULTURE_DEVIATION_THRESHOLD).toBe(10);
  });
});

// ─── deriveSegmentObservations ──────────────────────────────────────────────

describe('deriveSegmentObservations', () => {
  test('generates strongest, weakest, and gap observations', () => {
    const deltas = [
      makeDelta('core', 8),       // strongest positive
      makeDelta('clarity', -15),  // weakest (most negative)
      makeDelta('connection', 2),
      makeDelta('collaboration', -3),
    ];
    // segment scores: core=68, clarity=45, connection=62, collaboration=57
    // spread: 68 - 45 = 23 > 15

    const result = deriveSegmentObservations(deltas);

    expect(result).toHaveLength(3);

    // Strongest
    expect(result[0].dimensionCode).toBe('core');
    expect(result[0].title).toBe('Strong Core alignment');
    expect(result[0].description).toBe('Core is 8% above the organization average');
    expect(result[0].dotColor).toBe(dimensionTokens.core.color);

    // Weakest
    expect(result[1].dimensionCode).toBe('clarity');
    expect(result[1].title).toBe('Lower Clarity scores');
    expect(result[1].description).toBe('Clarity is 15% below the organization average');
    expect(result[1].dotColor).toBe(dimensionTokens.clarity.color);

    // Gap
    expect(result[2].dimensionCode).toBe('core');
    expect(result[2].title).toBe('Internal dimension gap');
    expect(result[2].description).toBe('Difference of 23% between Core and Clarity');
  });

  test('all positive deltas — no weakest, but strongest and gap possible', () => {
    const deltas = [
      makeDelta('core', 20),          // segmentScore=80
      makeDelta('clarity', 2),        // segmentScore=62
      makeDelta('connection', 5),     // segmentScore=65
      makeDelta('collaboration', 1),  // segmentScore=61
    ];
    // spread: 80 - 61 = 19 > 15

    const result = deriveSegmentObservations(deltas);

    // Strongest only (no negative deltas, so no weakest)
    const titles = result.map((o) => o.title);
    expect(titles).toContain('Strong Core alignment');
    expect(titles).not.toContain(expect.stringContaining('Lower'));
    expect(titles).toContain('Internal dimension gap');
    expect(result).toHaveLength(2);
  });

  test('all deltas near zero — returns empty array', () => {
    const deltas = [
      makeDelta('core', 0.3),
      makeDelta('clarity', -0.5),
      makeDelta('connection', 0.1),
      makeDelta('collaboration', 0),
    ];
    // No delta >= 1 in absolute value
    // spread: 60.3 - 59.5 = 0.8 < 15

    const result = deriveSegmentObservations(deltas);

    expect(result).toHaveLength(0);
  });

  test('empty deltas returns empty array', () => {
    const result = deriveSegmentObservations([]);
    expect(result).toHaveLength(0);
  });

  test('gap observation not generated when spread <= 15', () => {
    const deltas = [
      makeDelta('core', 5),       // segmentScore=65
      makeDelta('clarity', -5),   // segmentScore=55
      makeDelta('connection', 3), // segmentScore=63
      makeDelta('collaboration', -2), // segmentScore=58
    ];
    // spread: 65 - 55 = 10 <= 15

    const result = deriveSegmentObservations(deltas);
    const titles = result.map((o) => o.title);

    expect(titles).not.toContain('Internal dimension gap');
  });

  test('uses correct dimension brand colors', () => {
    const deltas = [
      makeDelta('clarity', 12),
      makeDelta('core', -8),
      makeDelta('connection', 0),
      makeDelta('collaboration', 0),
    ];

    const result = deriveSegmentObservations(deltas);

    const strongest = result.find((o) => o.title.includes('Strong'))!;
    expect(strongest.dotColor).toBe(dimensionTokens.clarity.color);

    const weakest = result.find((o) => o.title.includes('Lower'))!;
    expect(weakest.dotColor).toBe(dimensionTokens.core.color);
  });
});

// ─── findWeakestDimension ───────────────────────────────────────────────────

describe('findWeakestDimension', () => {
  test('returns dimension with most negative delta', () => {
    const deltas = [
      makeDelta('core', 5),
      makeDelta('clarity', -15),
      makeDelta('connection', -3),
      makeDelta('collaboration', 8),
    ];

    expect(findWeakestDimension(deltas)).toBe('clarity');
  });

  test('returns null when all deltas are positive', () => {
    const deltas = [
      makeDelta('core', 5),
      makeDelta('clarity', 2),
      makeDelta('connection', 8),
      makeDelta('collaboration', 1),
    ];

    expect(findWeakestDimension(deltas)).toBeNull();
  });

  test('returns null when all deltas are zero', () => {
    const deltas = [
      makeDelta('core', 0),
      makeDelta('clarity', 0),
      makeDelta('connection', 0),
      makeDelta('collaboration', 0),
    ];

    expect(findWeakestDimension(deltas)).toBeNull();
  });

  test('returns null for empty array', () => {
    expect(findWeakestDimension([])).toBeNull();
  });

  test('picks most negative among multiple negatives', () => {
    const deltas = [
      makeDelta('core', -5),
      makeDelta('clarity', -20),
      makeDelta('connection', -12),
      makeDelta('collaboration', -1),
    ];

    expect(findWeakestDimension(deltas)).toBe('clarity');
  });
});
