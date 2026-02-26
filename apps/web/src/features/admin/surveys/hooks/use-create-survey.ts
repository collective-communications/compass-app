/**
 * TanStack Query mutation hook for creating a new survey.
 * Invalidates the survey list cache on success.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { Survey } from '@compass/types';
import { createSurvey, type CreateSurveyParams } from '../services/admin-survey-service';
import { surveyListKeys } from './use-surveys';

/**
 * Creates a new survey (blank, from template, or duplicated).
 * Invalidates the survey list query on success so the list re-fetches.
 */
export function useCreateSurvey(): UseMutationResult<Survey, Error, CreateSurveyParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
    },
  });
}
