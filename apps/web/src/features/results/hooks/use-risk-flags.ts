/**
 * TanStack Query hook for risk flag evaluation.
 * Derives risk flags client-side from overall scores using the scoring package.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { evaluateRiskFlags, type RiskFlag } from '@compass/scoring';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';
import { useOverallScores } from './use-overall-scores';

/**
 * Evaluate risk flags for a survey by running `evaluateRiskFlags` against its
 * overall scores. Depends on `useOverallScores`; stays disabled until scores
 * are available so the flag list is always derived from fresh data.
 *
 * @param surveyId - Target survey. When empty the query is disabled.
 * @returns TanStack query result whose data is the array of active `RiskFlag`s.
 */
export function useRiskFlags(surveyId: string): UseQueryResult<RiskFlag[]> {
  const { data: scores } = useOverallScores(surveyId);

  return useQuery({
    queryKey: resultKeys.riskFlags(surveyId),
    queryFn: () => {
      if (!scores) throw new Error('Scores not available');
      return evaluateRiskFlags(scores);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId && !!scores,
  });
}
