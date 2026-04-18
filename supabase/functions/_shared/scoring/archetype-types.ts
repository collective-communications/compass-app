/** Vector definition for a culture archetype. */
export interface ArchetypeVector {
  id: string;
  code: string;
  name: string;
  description: string;
  /** Dimension code → target score (0-100). */
  targetScores: Record<string, number>;
  displayOrder: number;
}

/** Result of matching scores against an archetype. */
export interface ArchetypeMatch {
  archetype: ArchetypeVector;
  /** Euclidean distance from scores to archetype target. */
  distance: number;
  confidence: 'strong' | 'moderate' | 'weak';
}
