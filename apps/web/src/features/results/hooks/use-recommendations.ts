/**
 * TanStack Query hook for fetching recommendations.
 * Queries the recommendations table filtered by survey.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import type { RiskSeverity } from '@compass/scoring';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';
import type { Recommendation } from '../types';

/**
 * Shape of the recommendation row after the Supabase select.
 *
 * `recommendations` stores a `dimension_id` (UUID) rather than a textual code —
 * the code lives on the `dimensions` lookup table. We alias the joined row as
 * `dimension` and flatten it to a DimensionCode in `transformRows`.
 */
interface RecommendationRow {
  id: string;
  severity: string;
  title: string;
  body: string;
  actions: unknown;
  ccc_service_link: string | null;
  trust_ladder_link: string | null;
  priority: number;
  dimension: { code: string } | null;
}

function transformRows(rows: RecommendationRow[]): Recommendation[] {
  return rows.map((row) => ({
    id: row.id,
    // dimension_id is nullable; a recommendation without a dimension is global.
    // Cast empty string → DimensionCode would be unsafe, so default to 'core'
    // until we expose a real "global" code.
    dimensionCode: (row.dimension?.code ?? 'core') as DimensionCode,
    severity: row.severity as RiskSeverity,
    title: row.title,
    body: row.body,
    actions: Array.isArray(row.actions) ? (row.actions as string[]) : [],
    cccServiceLink: row.ccc_service_link,
    trustLadderLink: row.trust_ladder_link,
    priority: row.priority,
  }));
}

/**
 * Fetch the recommendation list for a survey, ordered by ascending priority.
 * Joins `dimensions.code` so each row carries a flat `DimensionCode` rather
 * than the raw UUID foreign key.
 *
 * @param surveyId - Target survey. When empty the query is disabled.
 * @returns TanStack query result whose data is the `Recommendation[]` for the survey.
 */
export function useRecommendations(surveyId: string): UseQueryResult<Recommendation[]> {
  return useQuery({
    queryKey: resultKeys.recommendations(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select(
          'id, severity, title, body, actions, ccc_service_link, trust_ladder_link, priority, dimension:dimensions(code)',
        )
        .eq('survey_id', surveyId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return transformRows((data ?? []) as unknown as RecommendationRow[]);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId,
  });
}
