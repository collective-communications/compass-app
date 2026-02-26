/**
 * TanStack Query hook for archetype identification.
 * Derives the archetype client-side from overall scores using the scoring package.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { identifyArchetype, type ArchetypeMatch, type ArchetypeVector } from '@compass/scoring';
import { resultKeys } from '../lib/query-keys';
import { useOverallScores } from './use-overall-scores';

/**
 * Hardcoded archetype vectors matching the Culture Compass framework.
 * These define the ideal score profiles for each organizational archetype.
 */
const ARCHETYPE_VECTORS: ArchetypeVector[] = [
  {
    id: 'balanced',
    code: 'balanced',
    name: 'Balanced',
    description: 'Consistently strong across all dimensions — a well-rounded culture.',
    targetScores: { core: 80, clarity: 80, connection: 80, collaboration: 80 },
    displayOrder: 0,
  },
  {
    id: 'clarity-driven',
    code: 'clarity-driven',
    name: 'Clarity-Driven',
    description: 'Strong sense of direction and purpose, with clear roles and expectations.',
    targetScores: { core: 70, clarity: 90, connection: 60, collaboration: 65 },
    displayOrder: 1,
  },
  {
    id: 'connection-driven',
    code: 'connection-driven',
    name: 'Connection-Driven',
    description: 'Deep interpersonal bonds and belonging, sometimes at the expense of structure.',
    targetScores: { core: 70, clarity: 60, connection: 90, collaboration: 65 },
    displayOrder: 2,
  },
  {
    id: 'collaboration-driven',
    code: 'collaboration-driven',
    name: 'Collaboration-Driven',
    description: 'Highly cooperative teams with strong cross-functional alignment.',
    targetScores: { core: 70, clarity: 65, connection: 65, collaboration: 90 },
    displayOrder: 3,
  },
  {
    id: 'core-fragile',
    code: 'core-fragile',
    name: 'Core-Fragile',
    description: 'Outer dimensions may appear functional, but foundational trust and safety are weak.',
    targetScores: { core: 40, clarity: 65, connection: 65, collaboration: 65 },
    displayOrder: 4,
  },
  {
    id: 'disconnected',
    code: 'disconnected',
    name: 'Disconnected',
    description: 'Low scores across the board — significant cultural challenges requiring intervention.',
    targetScores: { core: 35, clarity: 35, connection: 35, collaboration: 35 },
    displayOrder: 5,
  },
];

export function useArchetype(surveyId: string): UseQueryResult<ArchetypeMatch> {
  const { data: scores } = useOverallScores(surveyId);

  return useQuery({
    queryKey: resultKeys.archetype(surveyId),
    queryFn: () => {
      if (!scores) throw new Error('Scores not available');
      return identifyArchetype(scores, ARCHETYPE_VECTORS);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId && !!scores,
  });
}
