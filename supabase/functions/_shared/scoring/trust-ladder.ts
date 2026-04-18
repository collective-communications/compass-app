/**
 * Trust Ladder scoring — maps dimension scores to a 9-rung
 * organizational trust model used by CC+C.
 */

import type { DimensionCode, DimensionScoreMap } from './types.ts';

/** Status of a single trust ladder rung based on its dimension score. */
export type TrustRungStatus = 'achieved' | 'in_progress' | 'not_started';

/** Scored result for a single rung on the Trust Ladder. */
export interface TrustRungScore {
  rung: number;
  name: string;
  dimensionCode: DimensionCode;
  score: number;
  maxScore: 4;
  status: TrustRungStatus;
}

/** Full Trust Ladder computation result. */
export interface TrustLadderResult {
  rungs: TrustRungScore[];
  /** Highest rung number with 'achieved' status, 0 if none. */
  currentLevel: number;
  /** Labels of the first 1-2 actionable rungs above currentLevel. */
  nextActions: string[];
}

/** Static rung definitions ordered from foundation (1) to top (9). */
const RUNG_DEFINITIONS: readonly { rung: number; name: string; dimensionCode: DimensionCode }[] = [
  { rung: 1, name: 'Purpose', dimensionCode: 'core' },
  { rung: 2, name: 'Values', dimensionCode: 'core' },
  { rung: 3, name: 'Mission / Vision', dimensionCode: 'clarity' },
  { rung: 4, name: 'Strategic Priorities', dimensionCode: 'clarity' },
  { rung: 5, name: 'Role Clarification', dimensionCode: 'clarity' },
  { rung: 6, name: 'Relationship', dimensionCode: 'connection' },
  { rung: 7, name: 'Team Members', dimensionCode: 'connection' },
  { rung: 8, name: 'Processes & Platforms', dimensionCode: 'collaboration' },
  { rung: 9, name: 'Career / Growth', dimensionCode: 'collaboration' },
];

/** Classify a raw score (1–4) into a rung status. */
function classifyStatus(rawScore: number): TrustRungStatus {
  if (rawScore >= 3.0) return 'achieved';
  if (rawScore >= 2.0) return 'in_progress';
  return 'not_started';
}

/**
 * Calculate Trust Ladder position from dimension scores.
 *
 * Each rung maps to a dimension; the rung's score is the dimension's rawScore (1–4).
 * `currentLevel` is the highest rung number with 'achieved' status.
 * `nextActions` contains labels of the first 1–2 non-achieved rungs above currentLevel.
 */
export function calculateTrustLadderPosition(dimensionScores: DimensionScoreMap): TrustLadderResult {
  const rungs: TrustRungScore[] = RUNG_DEFINITIONS.map((def) => {
    const dimensionScore = dimensionScores[def.dimensionCode];
    const rawScore = dimensionScore?.rawScore ?? 0;

    return {
      rung: def.rung,
      name: def.name,
      dimensionCode: def.dimensionCode,
      score: rawScore,
      maxScore: 4 as const,
      status: classifyStatus(rawScore),
    };
  });

  let currentLevel = 0;
  for (const rung of rungs) {
    if (rung.status === 'achieved') {
      currentLevel = rung.rung;
    }
  }

  const nextActions: string[] = [];
  for (const rung of rungs) {
    if (rung.rung > currentLevel && rung.status !== 'achieved' && nextActions.length < 2) {
      nextActions.push(rung.name);
    }
  }

  return { rungs, currentLevel, nextActions };
}
