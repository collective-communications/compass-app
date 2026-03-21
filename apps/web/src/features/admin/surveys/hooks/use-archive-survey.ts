/**
 * TanStack Query mutation hooks for archiving and unarchiving surveys.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { archiveSurvey, unarchiveSurvey } from '../services/deployment-service';
import { surveyListKeys } from './use-surveys';

/** Archive a survey (soft delete) */
export function useArchiveSurvey(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (surveyId: string) => archiveSurvey(surveyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
    },
  });
}

/** Unarchive a survey (restore to closed status) */
export function useUnarchiveSurvey(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (surveyId: string) => unarchiveSurvey(surveyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
    },
  });
}
