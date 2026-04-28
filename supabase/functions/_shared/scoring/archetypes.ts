/**
 * Archetype vectors for the Culture Compass framework.
 *
 * Synced from packages/scoring/src/archetypes.ts via scripts/sync-scoring.sh.
 * These match the `archetypes` table in the database exactly — same codes,
 * names, descriptions, and target score vectors.
 *
 * NOTE: The score-survey edge function reads archetypes from the database
 * at runtime, so this file is used only by other edge functions that call
 * identifyArchetype directly. Keep in sync with the database migration.
 */
import type { ArchetypeVector } from './archetype-types.ts';

/** Culture Compass archetype vectors. Order matches `display_order` in the database. */
export const ARCHETYPE_VECTORS: ArchetypeVector[] = [
  {
    id: 'aligned',
    code: 'aligned',
    name: 'Aligned & Thriving',
    description:
      'High scores across all dimensions. The organization demonstrates strong cultural alignment with clear communication, genuine connection, and effective collaboration.',
    targetScores: { core: 85, clarity: 80, connection: 80, collaboration: 80 },
    displayOrder: 0,
  },
  {
    id: 'over_collaborated',
    code: 'over_collaborated',
    name: 'Over-Collaborated',
    description:
      'Strong connection and collaboration but lower clarity. Teams work well together but may lack clear direction, leading to consensus-seeking over decisive action.',
    targetScores: { core: 60, clarity: 40, connection: 80, collaboration: 85 },
    displayOrder: 1,
  },
  {
    id: 'well_intentioned',
    code: 'well_intentioned',
    name: 'Well-Intentioned but Disconnected',
    description:
      'Moderate scores with a gap between intent and impact. Leadership means well but communication gaps create misalignment between stated values and lived experience.',
    targetScores: { core: 55, clarity: 55, connection: 45, collaboration: 50 },
    displayOrder: 2,
  },
  {
    id: 'command_and_control',
    code: 'command_and_control',
    name: 'Command & Control',
    description:
      'High clarity but low connection and collaboration. Communication flows top-down with clear directives but limited feedback loops or peer collaboration.',
    targetScores: { core: 50, clarity: 75, connection: 30, collaboration: 35 },
    displayOrder: 3,
  },
  {
    id: 'busy_but_burned',
    code: 'busy_but_burned',
    name: 'Busy but Burned Out',
    description:
      'Low scores across dimensions, especially connection. High activity masks cultural dysfunction — people are working hard but not working well together.',
    targetScores: { core: 30, clarity: 35, connection: 25, collaboration: 40 },
    displayOrder: 4,
  },
];
