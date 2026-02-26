/**
 * TanStack Query mutation hook for reordering survey questions.
 * Uses optimistic updates to provide immediate visual feedback.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { QuestionWithDimension } from '@compass/types';
import {
  reorderQuestions,
  type ReorderQuestionParams,
  type SurveyBuilderData,
} from '../services/admin-survey-service';
import { surveyBuilderKeys } from './use-survey-builder';

interface ReorderMutationParams {
  surveyId: string;
  reorders: ReorderQuestionParams[];
}

/**
 * Reorders questions within a survey with optimistic UI updates.
 * On mutation, immediately updates the local cache with new ordering,
 * then rolls back on error.
 */
export function useReorderQuestions(): UseMutationResult<void, Error, ReorderMutationParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, reorders }) => reorderQuestions(surveyId, reorders),

    onMutate: async ({ surveyId, reorders }) => {
      const queryKey = surveyBuilderKeys.detail(surveyId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<SurveyBuilderData>(queryKey);

      if (previous) {
        const orderMap = new Map(reorders.map((r) => [r.questionId, r.newOrder]));

        const updatedQuestions: QuestionWithDimension[] = previous.questions
          .map((q) => ({
            ...q,
            displayOrder: orderMap.get(q.id) ?? q.displayOrder,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);

        queryClient.setQueryData<SurveyBuilderData>(queryKey, {
          ...previous,
          questions: updatedQuestions,
        });
      }

      return { previous, queryKey };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    onSettled: (_data, _error, { surveyId }) => {
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });
}
