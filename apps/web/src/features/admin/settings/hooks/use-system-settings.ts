/**
 * TanStack Query hook for system-level platform settings.
 * Provides current settings, an auto-saving mutation with 500ms debounce,
 * and a save status indicator.
 */

import { useRef, useState, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface SystemSettings {
  id: string;
  anonymity_threshold: number;
  default_duration_days: number;
  welcome_message: string;
  completion_message: string;
  logo_url: string | null;
  brand_colors: {
    core: string;
    clarity: string;
    connection: string;
    collaboration: string;
  };
  data_retention_policy: string;
  updated_at: string;
}

const SETTINGS_DEFAULTS: Omit<SystemSettings, 'id' | 'updated_at'> = {
  anonymity_threshold: 5,
  default_duration_days: 30,
  welcome_message:
    'Welcome to the Culture Compass survey. Your responses are completely anonymous and will help shape the future of your organization.',
  completion_message:
    'Thank you for completing the survey. Your anonymous responses have been recorded.',
  logo_url: null,
  brand_colors: {
    core: '#0C3D50',
    clarity: '#FF7F50',
    connection: '#9FD7C3',
    collaboration: '#E8B4A8',
  },
  data_retention_policy: 'indefinite',
};

/** Query key factory for system settings */
export const systemSettingsKeys = {
  all: ['admin', 'system-settings'] as const,
  detail: () => [...systemSettingsKeys.all, 'detail'] as const,
};

async function fetchSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to fetch system settings: ${error.message}`);
  }

  return data as SystemSettings;
}

async function updateSystemSettings(
  updates: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>,
): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .update(updates)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update system settings: ${error.message}`);
  }

  return data as SystemSettings;
}

export interface UseSystemSettingsReturn {
  query: UseQueryResult<SystemSettings>;
  settings: SystemSettings | undefined;
  saveStatus: SaveStatus;
  updateField: <K extends keyof SystemSettings>(
    field: K,
    value: SystemSettings[K],
  ) => void;
  defaults: typeof SETTINGS_DEFAULTS;
}

/**
 * Fetches platform-level settings and provides a debounced auto-save mutation.
 * Save status tracks whether the latest change has been persisted.
 */
export function useSystemSettings(): UseSystemSettingsReturn {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const query = useQuery({
    queryKey: systemSettingsKeys.detail(),
    queryFn: fetchSystemSettings,
  });

  const mutation = useMutation({
    mutationFn: updateSystemSettings,
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(systemSettingsKeys.detail(), data);
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  const updateField = useCallback(
    <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]): void => {
      // Optimistic update in cache
      queryClient.setQueryData<SystemSettings>(
        systemSettingsKeys.detail(),
        (prev) => (prev ? { ...prev, [field]: value } : prev),
      );

      // Debounce the actual mutation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        mutation.mutate({ [field]: value });
      }, 500);
    },
    [queryClient, mutation],
  );

  return {
    query,
    settings: query.data,
    saveStatus,
    updateField,
    defaults: SETTINGS_DEFAULTS,
  };
}
