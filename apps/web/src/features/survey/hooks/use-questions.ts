/**
 * TanStack Query hook to fetch survey questions.
 * Returns questions ordered by display_order, joined with dimension mappings.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { QuestionWithDimension } from '@compass/types';
import { STALE_TIMES } from '../../../lib/query-config';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();

/** Fetch all questions for a survey, ordered by display_order. */
export function useQuestions(
  surveyId: string | undefined,
  deploymentToken?: string,
): UseQueryResult<QuestionWithDimension[]> {
  return useQuery<QuestionWithDimension[]>({
    queryKey: ['questions', surveyId, deploymentToken ?? 'authenticated'],
    queryFn: () => {
      if (!surveyId) return Promise.resolve([]);
      return adapter.getQuestions(surveyId, deploymentToken);
    },
    enabled: !!surveyId,
    staleTime: STALE_TIMES.static,
    retry: 2,
  });
}
