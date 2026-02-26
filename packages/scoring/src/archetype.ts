import type { DimensionScoreMap } from './types.js';
import type { ArchetypeVector, ArchetypeMatch } from './archetype-types.js';
import { ScoringError } from './errors.js';

/** Euclidean distance threshold for strong confidence. */
const CONFIDENCE_STRONG = 15;

/** Euclidean distance threshold for moderate confidence. */
const CONFIDENCE_MODERATE = 25;

/** Compute Euclidean distance between observed scores and a target vector. */
export function euclideanDistance(
  scores: Record<string, number>,
  target: Record<string, number>,
): number {
  const keys = Object.keys(target);
  let sumSquared = 0;

  for (const key of keys) {
    const a = scores[key] ?? 0;
    const b = target[key];
    sumSquared += (a - b) ** 2;
  }

  return Math.sqrt(sumSquared);
}

/** Map a Euclidean distance to a confidence level. */
export function distanceToConfidence(distance: number): 'strong' | 'moderate' | 'weak' {
  if (distance < CONFIDENCE_STRONG) return 'strong';
  if (distance < CONFIDENCE_MODERATE) return 'moderate';
  return 'weak';
}

/**
 * Identify the closest archetype to the given dimension scores.
 * Tiebreaker: lower displayOrder wins.
 */
export function identifyArchetype(
  scores: DimensionScoreMap,
  archetypes: ArchetypeVector[],
): ArchetypeMatch {
  if (archetypes.length === 0) {
    throw new ScoringError('EMPTY_ARCHETYPES', 'Archetypes array must not be empty');
  }

  const scoreMap: Record<string, number> = {};
  for (const [code, dim] of Object.entries(scores)) {
    scoreMap[code] = dim.score;
  }

  let bestMatch: ArchetypeMatch | undefined;

  for (const archetype of archetypes) {
    const distance = euclideanDistance(scoreMap, archetype.targetScores);
    const confidence = distanceToConfidence(distance);

    if (
      !bestMatch ||
      distance < bestMatch.distance ||
      (distance === bestMatch.distance && archetype.displayOrder < bestMatch.archetype.displayOrder)
    ) {
      bestMatch = { archetype, distance, confidence };
    }
  }

  return bestMatch!;
}
