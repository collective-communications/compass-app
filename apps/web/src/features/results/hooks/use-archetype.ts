/**
 * TanStack Query hook for archetype identification.
 * Derives the archetype client-side from overall scores using the scoring package.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ARCHETYPE_VECTORS, identifyArchetype, type ArchetypeMatch } from '@compass/scoring';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';
import { useOverallScores } from './use-overall-scores';

/**
 * Identify the closest archetype for a survey's overall scores.
 * Depends on `useOverallScores` — remains disabled until scores arrive, then
 * runs `identifyArchetype` against the canonical `ARCHETYPE_VECTORS` locally.
 *
 * @param surveyId - Target survey. When empty the query is disabled.
 * @returns TanStack query result whose data is the best-matching `ArchetypeMatch`.
 */
export function useArchetype(surveyId: string): UseQueryResult<ArchetypeMatch> {
  const { data: scores } = useOverallScores(surveyId);

  return useQuery({
    queryKey: resultKeys.archetype(surveyId),
    queryFn: () => {
      if (!scores) throw new Error('Scores not available');
      return identifyArchetype(scores, ARCHETYPE_VECTORS);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId && !!scores,
  });
}
