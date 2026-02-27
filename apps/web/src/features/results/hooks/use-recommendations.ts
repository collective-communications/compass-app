/**
 * TanStack Query hook for fetching recommendations.
 * Queries the recommendations table filtered by survey.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import type { RiskSeverity } from '@compass/scoring';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';
import type { Recommendation } from '../types';

interface RecommendationRow {
  id: string;
  dimension_code: string;
  severity: string;
  title: string;
  body: string;
  actions: string[];
  ccc_service_link: string | null;
  trust_ladder_link: string | null;
  priority: number;
}

function transformRows(rows: RecommendationRow[]): Recommendation[] {
  return rows.map((row) => ({
    id: row.id,
    dimensionCode: row.dimension_code as DimensionCode,
    severity: row.severity as RiskSeverity,
    title: row.title,
    body: row.body,
    actions: Array.isArray(row.actions) ? row.actions : [],
    cccServiceLink: row.ccc_service_link,
    trustLadderLink: row.trust_ladder_link,
    priority: row.priority,
  }));
}

export function useRecommendations(surveyId: string): UseQueryResult<Recommendation[]> {
  return useQuery({
    queryKey: resultKeys.recommendations(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, dimension_code, severity, title, body, actions, ccc_service_link, trust_ladder_link, priority')
        .eq('survey_id', surveyId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return transformRows(data as RecommendationRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId,
  });
}
