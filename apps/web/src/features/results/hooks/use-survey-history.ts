/**
 * TanStack Query hook for fetching historical surveys for an organization.
 * Returns closed and archived surveys ordered by closes_at descending.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';

export interface SurveyHistoryEntry {
  id: string;
  title: string;
  status: 'closed' | 'archived';
  closesAt: string;
}

interface SurveyHistoryRow {
  id: string;
  title: string;
  status: string;
  closes_at: string;
}

export function useSurveyHistory(
  organizationId: string,
): UseQueryResult<SurveyHistoryEntry[]> {
  return useQuery({
    queryKey: [...resultKeys.all, 'surveyHistory', organizationId],
    queryFn: async (): Promise<SurveyHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, status, closes_at')
        .eq('organization_id', organizationId)
        .in('status', ['closed', 'archived'])
        .order('closes_at', { ascending: false });

      if (error) throw error;

      return (data as SurveyHistoryRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as 'closed' | 'archived',
        closesAt: row.closes_at,
      }));
    },
    staleTime: STALE_TIMES.results,
    enabled: !!organizationId,
  });
}
