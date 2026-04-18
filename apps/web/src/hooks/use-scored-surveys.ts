/**
 * TanStack Query hook for fetching surveys with calculated scores.
 * Powers the survey picker dropdown in the results layout.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { STALE_TIMES } from '../lib/query-config';
import { surveyQueryKeys } from '../lib/query-keys';
import type { ScoredSurvey } from '../lib/types/survey';

/**
 * Shape of the scored-survey row after the Supabase select.
 *
 * The `surveys` table does not carry `scores_calculated_at` or `response_count`
 * directly (see supabase/migrations/00000000000002_survey_response_tables.sql).
 * Instead we join:
 *   - `scores` for the latest `calculated_at` (MAX across dimensions).
 *   - `deployments -> responses (count)` for the completion tally.
 */
interface ScoredSurveyRow {
  id: string;
  title: string;
  closes_at: string | null;
  updated_at: string;
  scores: { calculated_at: string }[] | null;
  deployments: { responses: { count: number }[] | null }[] | null;
}

function transformRows(rows: ScoredSurveyRow[]): ScoredSurvey[] {
  return rows.map((row) => {
    // Pick the most recent score calculation as the "scores finalized at" timestamp.
    // Fall back to updated_at (which is bumped when scores_calculated flips true)
    // so the picker still has a sortable date if the scores row is missing.
    const latestScoreAt = row.scores?.reduce<string | null>((latest, s) => {
      if (!latest || s.calculated_at > latest) return s.calculated_at;
      return latest;
    }, null);

    const responseCount = (row.deployments ?? []).reduce(
      (sum, dep) => sum + (dep.responses?.[0]?.count ?? 0),
      0,
    );

    return {
      id: row.id,
      title: row.title,
      closedAt: row.closes_at,
      scoresCalculatedAt: latestScoreAt ?? row.updated_at,
      responseCount,
    };
  });
}

export function useScoredSurveys(organizationId: string): UseQueryResult<ScoredSurvey[]> {
  return useQuery({
    queryKey: surveyQueryKeys.scoredSurveys(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(
          'id, title, closes_at, updated_at, scores(calculated_at), deployments(responses(count))',
        )
        .eq('organization_id', organizationId)
        .eq('scores_calculated', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return transformRows((data ?? []) as unknown as ScoredSurveyRow[]);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!organizationId,
  });
}
