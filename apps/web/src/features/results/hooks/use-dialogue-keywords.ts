/**
 * TanStack Query hook for fetching pre-computed dialogue keyword themes.
 * Keywords are extracted server-side during score-survey and stored in
 * dialogue_keywords, so this is a plain read with no client-side computation.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';

/** A single keyword theme as returned from the dialogue_keywords table. */
export interface DialogueKeyword {
  id: string;
  dimensionId: string | null;
  keyword: string;
  frequency: number;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
}

interface DialogueKeywordRow {
  id: string;
  dimension_id: string | null;
  keyword: string;
  frequency: number;
  sentiment: string | null;
}

function transformRows(rows: DialogueKeywordRow[]): DialogueKeyword[] {
  return rows.map((row) => ({
    id: row.id,
    dimensionId: row.dimension_id,
    keyword: row.keyword,
    frequency: row.frequency,
    sentiment: row.sentiment as DialogueKeyword['sentiment'],
  }));
}

/**
 * Fetch pre-computed keyword themes for a survey, ordered by frequency descending.
 *
 * The server caps output at MAX_KEYWORDS_PER_GROUP × number of groups
 * (≈ 125 rows maximum), so no client-side limit is applied.
 *
 * @param surveyId - Target survey. When empty the query is disabled.
 * @returns TanStack query result whose data is the `DialogueKeyword[]` for the survey.
 */
export function useDialogueKeywords(surveyId: string): UseQueryResult<DialogueKeyword[]> {
  return useQuery({
    queryKey: resultKeys.dialogueKeywords(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dialogue_keywords')
        .select('id, dimension_id, keyword, frequency, sentiment')
        .eq('survey_id', surveyId)
        .order('frequency', { ascending: false });

      if (error) throw error;
      return transformRows((data ?? []) as DialogueKeywordRow[]);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId,
  });
}
