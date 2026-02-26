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
  description: string;
  priority: number;
}

function transformRows(rows: RecommendationRow[]): Recommendation[] {
  return rows.map((row) => ({
    id: row.id,
    dimensionCode: row.dimension_code as DimensionCode,
    severity: row.severity as RiskSeverity,
    title: row.title,
    description: row.description,
    priority: row.priority,
  }));
}

export function useRecommendations(surveyId: string): UseQueryResult<Recommendation[]> {
  return useQuery({
    queryKey: resultKeys.recommendations(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('survey_id', surveyId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return transformRows(data as RecommendationRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId,
  });
}
