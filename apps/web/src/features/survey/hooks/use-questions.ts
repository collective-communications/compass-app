/**
 * TanStack Query hook to fetch survey questions.
 * Returns questions ordered by display_order, joined with dimension mappings.
 */
import { useQuery } from '@tanstack/react-query';
import type { QuestionWithDimension } from '@compass/types';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();

/** Fetch all questions for a survey, ordered by display_order. */
export function useQuestions(surveyId: string | undefined) {
  return useQuery<QuestionWithDimension[]>({
    queryKey: ['questions', surveyId],
    queryFn: () => {
      if (!surveyId) return Promise.resolve([]);
      return adapter.getQuestions(surveyId);
    },
    enabled: !!surveyId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}
