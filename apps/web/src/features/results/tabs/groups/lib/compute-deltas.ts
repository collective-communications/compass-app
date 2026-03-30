/**
 * Shared utilities for computing dimension score deltas between segments
 * and the organization overall. Used by multiple groups-tab components.
 *
 * All functions are pure — no side effects, hooks, or DOM access.
 */

import type { DimensionCode } from '@compass/types';
import type { DimensionScoreMap } from '@compass/scoring';
import { dimensions as dimensionTokens } from '@compass/tokens';
import type { DimensionScoreRow } from '../../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Delta between a segment's dimension score and the organization overall. */
export interface DimensionDelta {
  dimensionCode: DimensionCode;
  label: string;
  /** segmentScore - overallScore (can be negative). */
  delta: number;
  segmentScore: number;
  overallScore: number;
}

/** Observation derived from segment deltas, displayed as insight bullets. */
export interface SegmentObservation {
  dimensionCode: DimensionCode;
  title: string;
  description: string;
  /** Dimension brand color from tokens. */
  dotColor: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Percentage-point threshold for subculture deviation alerts. */
export const SUBCULTURE_DEVIATION_THRESHOLD = 10;

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const DIMENSIONS: DimensionCode[] = [
  'core',
  'clarity',
  'connection',
  'collaboration',
];

/** Minimum spread between highest and lowest segment scores to generate a gap observation. */
const GAP_THRESHOLD = 15;

/** Minimum absolute delta to consider an observation meaningful. */
const MEANINGFUL_DELTA_THRESHOLD = 1;

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Computes the delta between segment dimension scores and overall organization scores.
 *
 * @param segmentRows - Dimension score rows for a specific segment.
 * @param overallScores - Organization-wide dimension score map.
 * @returns Deltas for all 4 dimensions, ordered core/clarity/connection/collaboration.
 *          Missing segment dimensions default to a score of 0.
 */
export function computeDimensionDeltas(
  segmentRows: DimensionScoreRow[],
  overallScores: DimensionScoreMap,
): DimensionDelta[] {
  const segmentMap = new Map<DimensionCode, number>();
  for (const row of segmentRows) {
    if (row.score != null) {
      segmentMap.set(row.dimensionCode, row.score);
    }
  }

  return DIMENSIONS.map((code) => {
    const segmentScore = segmentMap.get(code) ?? 0;
    const overallScore = overallScores[code]?.score ?? 0;
    return {
      dimensionCode: code,
      label: DIMENSION_LABELS[code],
      delta: segmentScore - overallScore,
      segmentScore,
      overallScore,
    };
  });
}

/**
 * Filters deltas to only those that exceed the subculture deviation threshold.
 *
 * @param deltas - Dimension deltas to evaluate.
 * @param threshold - Percentage-point threshold (defaults to {@link SUBCULTURE_DEVIATION_THRESHOLD}).
 * @returns Deltas where |delta| exceeds the threshold.
 */
export function hasSubcultureDeviation(
  deltas: DimensionDelta[],
  threshold: number = SUBCULTURE_DEVIATION_THRESHOLD,
): DimensionDelta[] {
  return deltas.filter((d) => Math.abs(d.delta) > threshold);
}

/**
 * Derives up to 3 human-readable observations from dimension deltas:
 * 1. Strongest dimension (highest positive delta)
 * 2. Weakest dimension (largest negative delta)
 * 3. Internal gap (spread between highest and lowest segment scores > 15 points)
 *
 * @param deltas - Dimension deltas to analyze.
 * @returns Observations with titles, descriptions, and dimension brand colors.
 *          Empty array if all deltas are near zero.
 */
export function deriveSegmentObservations(
  deltas: DimensionDelta[],
): SegmentObservation[] {
  if (deltas.length === 0) return [];

  const observations: SegmentObservation[] = [];

  // Find strongest (most positive delta)
  let strongest: DimensionDelta | null = null;
  for (const d of deltas) {
    if (d.delta > 0 && (!strongest || d.delta > strongest.delta)) {
      strongest = d;
    }
  }

  if (strongest && strongest.delta >= MEANINGFUL_DELTA_THRESHOLD) {
    observations.push({
      dimensionCode: strongest.dimensionCode,
      title: `Strong ${strongest.label} alignment`,
      description: `${strongest.label} is ${Math.round(Math.abs(strongest.delta))}% above the organization average`,
      dotColor: dimensionTokens[strongest.dimensionCode].color,
    });
  }

  // Find weakest (most negative delta)
  let weakest: DimensionDelta | null = null;
  for (const d of deltas) {
    if (d.delta < 0 && (!weakest || d.delta < weakest.delta)) {
      weakest = d;
    }
  }

  if (weakest && Math.abs(weakest.delta) >= MEANINGFUL_DELTA_THRESHOLD) {
    observations.push({
      dimensionCode: weakest.dimensionCode,
      title: `Lower ${weakest.label} scores`,
      description: `${weakest.label} is ${Math.round(Math.abs(weakest.delta))}% below the organization average`,
      dotColor: dimensionTokens[weakest.dimensionCode].color,
    });
  }

  // Internal dimension gap
  const scores = deltas.map((d) => d.segmentScore);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const spread = maxScore - minScore;

  if (spread > GAP_THRESHOLD) {
    const highDim = deltas.find((d) => d.segmentScore === maxScore)!;
    const lowDim = deltas.find((d) => d.segmentScore === minScore)!;

    observations.push({
      dimensionCode: highDim.dimensionCode,
      title: 'Internal dimension gap',
      description: `Difference of ${Math.round(spread)}% between ${highDim.label} and ${lowDim.label}`,
      dotColor: dimensionTokens[highDim.dimensionCode].color,
    });
  }

  return observations;
}

/**
 * Finds the dimension with the most negative delta (weakest relative performance).
 *
 * @param deltas - Dimension deltas to search.
 * @returns The dimension code with the most negative delta, or null if
 *          deltas is empty or all deltas are non-negative.
 */
export function findWeakestDimension(
  deltas: DimensionDelta[],
): DimensionCode | null {
  if (deltas.length === 0) return null;

  let weakest: DimensionDelta | null = null;
  for (const d of deltas) {
    if (d.delta < 0 && (!weakest || d.delta < weakest.delta)) {
      weakest = d;
    }
  }

  return weakest?.dimensionCode ?? null;
}
