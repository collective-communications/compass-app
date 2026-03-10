/**
 * TanStack Query hooks for survey recipient management.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { SurveyRecipient } from '@compass/types';
import {
  listRecipients,
  addRecipients,
  removeRecipient,
  getRecipientStats,
  sendInvitations,
  type AddRecipientInput,
  type RecipientStats,
} from '../services/recipient-service';

/** Query key factory for recipient queries */
export const recipientKeys = {
  all: ['admin', 'recipients'] as const,
  list: (surveyId: string) => [...recipientKeys.all, 'list', surveyId] as const,
  stats: (surveyId: string) => [...recipientKeys.all, 'stats', surveyId] as const,
};

/** Fetch all recipients for a survey */
export function useRecipients(surveyId: string): UseQueryResult<SurveyRecipient[]> {
  return useQuery({
    queryKey: recipientKeys.list(surveyId),
    queryFn: () => listRecipients(surveyId),
    enabled: !!surveyId,
  });
}

/** Fetch recipient stats for a survey */
export function useRecipientStats(surveyId: string): UseQueryResult<RecipientStats> {
  return useQuery({
    queryKey: recipientKeys.stats(surveyId),
    queryFn: () => getRecipientStats(surveyId),
    enabled: !!surveyId,
  });
}

/** Mutation: bulk add recipients */
export function useAddRecipients(): UseMutationResult<
  SurveyRecipient[],
  Error,
  { surveyId: string; recipients: AddRecipientInput[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, recipients }) => addRecipients(surveyId, recipients),
    onSuccess: (_data, { surveyId }) => {
      queryClient.invalidateQueries({ queryKey: recipientKeys.list(surveyId) });
      queryClient.invalidateQueries({ queryKey: recipientKeys.stats(surveyId) });
    },
  });
}

/** Mutation: remove a single recipient */
export function useRemoveRecipient(): UseMutationResult<
  void,
  Error,
  { recipientId: string; surveyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipientId }) => removeRecipient(recipientId),
    onSuccess: (_data, { surveyId }) => {
      queryClient.invalidateQueries({ queryKey: recipientKeys.list(surveyId) });
      queryClient.invalidateQueries({ queryKey: recipientKeys.stats(surveyId) });
    },
  });
}

/** Mutation: send invitations to pending recipients */
export function useSendInvitations(): UseMutationResult<
  { sent: number; failed: number; errors: string[] },
  Error,
  { surveyId: string; deploymentId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ surveyId, deploymentId }) => sendInvitations(surveyId, deploymentId),
    onSuccess: (_data, { surveyId }) => {
      queryClient.invalidateQueries({ queryKey: recipientKeys.list(surveyId) });
      queryClient.invalidateQueries({ queryKey: recipientKeys.stats(surveyId) });
    },
  });
}
