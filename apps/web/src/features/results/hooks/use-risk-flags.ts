/**
 * TanStack Query hook for risk flag evaluation.
 * Derives risk flags client-side from overall scores using the scoring package.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { evaluateRiskFlags, type RiskFlag } from '@compass/scoring';
import { resultKeys } from '../lib/query-keys';
import { useOverallScores } from './use-overall-scores';

export function useRiskFlags(surveyId: string): UseQueryResult<RiskFlag[]> {
  const { data: scores } = useOverallScores(surveyId);

  return useQuery({
    queryKey: resultKeys.riskFlags(surveyId),
    queryFn: () => {
      if (!scores) throw new Error('Scores not available');
      return evaluateRiskFlags(scores);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId && !!scores,
  });
}
