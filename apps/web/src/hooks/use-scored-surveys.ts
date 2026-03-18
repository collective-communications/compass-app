/**
 * TanStack Query hook for fetching surveys with calculated scores.
 * Powers the survey picker dropdown in the results layout.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { resultKeys } from '../features/results/lib/query-keys';
import type { ScoredSurvey } from '../features/results/types';

interface ScoredSurveyRow {
  id: string;
  title: string;
  closes_at: string | null;
  scores_calculated_at: string | null;
  response_count: number;
}

function transformRows(rows: ScoredSurveyRow[]): ScoredSurvey[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    closedAt: row.closes_at,
    scoresCalculatedAt: row.scores_calculated_at,
    responseCount: row.response_count,
  }));
}

export function useScoredSurveys(organizationId: string): UseQueryResult<ScoredSurvey[]> {
  return useQuery({
    queryKey: resultKeys.scoredSurveys(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, closes_at, scores_calculated_at, response_count')
        .eq('organization_id', organizationId)
        .eq('scores_calculated', true)
        .order('scores_calculated_at', { ascending: false });

      if (error) throw error;
      return transformRows(data as ScoredSurveyRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!organizationId,
  });
}
