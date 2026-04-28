/**
 * TanStack Query hook for per-user notification preferences.
 * Upserts on first write — no row exists until the user changes a preference.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

export interface NotificationPreferences {
  surveyInvitationEnabled: boolean;
  reminderEnabled: boolean;
  reportReadyEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  surveyInvitationEnabled: true,
  reminderEnabled: true,
  reportReadyEnabled: true,
};

const QUERY_KEY = ['settings', 'notification-preferences'] as const;

async function fetchPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('survey_invitation_enabled, reminder_enabled, report_ready_enabled')
    .maybeSingle();

  if (error) {
    logger.error({ err: error, fn: 'fetchPreferences' }, 'Failed to fetch notification preferences');
    throw new Error(`Failed to fetch notification preferences: ${error.message}`);
  }

  if (data === null) {
    return DEFAULT_PREFERENCES;
  }

  return {
    surveyInvitationEnabled: data.survey_invitation_enabled,
    reminderEnabled: data.reminder_enabled,
    reportReadyEnabled: data.report_ready_enabled,
  };
}

interface UpsertPayload {
  field: keyof NotificationPreferences;
  value: boolean;
}

const FIELD_TO_COLUMN: Record<keyof NotificationPreferences, string> = {
  surveyInvitationEnabled: 'survey_invitation_enabled',
  reminderEnabled: 'reminder_enabled',
  reportReadyEnabled: 'report_ready_enabled',
};

async function upsertPreference(payload: UpsertPayload): Promise<NotificationPreferences> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const column = FIELD_TO_COLUMN[payload.field];
  const row = { user_id: user.id, [column]: payload.value };

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select('survey_invitation_enabled, reminder_enabled, report_ready_enabled')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'upsertPreference', ...payload }, 'Failed to update notification preference');
    throw new Error(`Failed to update notification preference: ${error.message}`);
  }

  return {
    surveyInvitationEnabled: data.survey_invitation_enabled,
    reminderEnabled: data.reminder_enabled,
    reportReadyEnabled: data.report_ready_enabled,
  };
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  isLoading: boolean;
  updatePreference: (field: keyof NotificationPreferences, value: boolean) => void;
  isSaving: boolean;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPreferences,
  });

  const mutation = useMutation({
    mutationFn: upsertPreference,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreferences>(QUERY_KEY);
      queryClient.setQueryData<NotificationPreferences>(QUERY_KEY, (prev) =>
        prev ? { ...prev, [payload.field]: payload.value } : prev,
      );
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES,
    isLoading: query.isLoading,
    updatePreference: (field, value) => mutation.mutate({ field, value }),
    isSaving: mutation.isPending,
  };
}
