/**
 * TanStack Query hook for fetching open-ended dialogue responses.
 * Supports optional filtering by question.
 *
 * ## Pagination cap
 *
 * A hard server-side cap of {@link DIALOGUE_RESPONSES_CAP} rows is applied
 * so large surveys don't ship megabytes of raw text to the client on first
 * paint. The hook exposes a `hasMore` signal so callers can surface a
 * "Load more" affordance or a note when the cap is hit. We intentionally
 * stop short of full infinite scroll — the cap handles the 99% case
 * (surveys typically have far fewer dialogue responses) and keeps the
 * client-side derivation (topic counts, word clouds) bounded.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';
import type { DialogueResponse } from '../types';

/**
 * Maximum number of dialogue responses loaded in a single query.
 *
 * Chosen to cover nearly every real-world survey we expect (even a 2,000-
 * person survey rarely exceeds ~400 open-ended responses per question) while
 * keeping payloads predictable. Callers can detect the cap via
 * {@link UseDialogueResponsesResult.hasMore} and render a cue.
 */
export const DIALOGUE_RESPONSES_CAP = 500;

interface DialogueRow {
  id: string;
  question_id: string;
  question_text: string;
  response_text: string;
  created_at: string;
}

function transformRows(rows: DialogueRow[]): DialogueResponse[] {
  return rows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    questionText: row.question_text,
    responseText: row.response_text,
    createdAt: row.created_at,
  }));
}

export interface UseDialogueResponsesOptions {
  surveyId: string;
  questionId?: string;
}

/**
 * Shape stored inside TanStack Query's cache: the trimmed rows plus a flag
 * indicating whether the server had more rows than the cap allowed.
 */
interface DialogueResponsesPage {
  responses: DialogueResponse[];
  hasMore: boolean;
}

/**
 * Extended query result that exposes `hasMore` and the `cap` alongside the
 * regular TanStack Query fields. `data` is still the `DialogueResponse[]`
 * most consumers care about.
 */
export type UseDialogueResponsesResult = UseQueryResult<DialogueResponse[]> & {
  /** True when the server had more than {@link DIALOGUE_RESPONSES_CAP} rows. */
  hasMore: boolean;
  /** Upper bound on rows loaded — surfaced so callers can wire an affordance. */
  cap: number;
};

export function useDialogueResponses({
  surveyId,
  questionId,
}: UseDialogueResponsesOptions): UseDialogueResponsesResult {
  const query = useQuery<DialogueResponsesPage>({
    queryKey: resultKeys.dialogueResponses(surveyId, questionId),
    queryFn: async () => {
      // Request one extra row beyond the cap to detect overflow in a single
      // round-trip. Cheap on the client and avoids a separate count query.
      let builder = supabase
        .from('dialogue_responses')
        .select('id, question_id, question_text, response_text, created_at')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false })
        .limit(DIALOGUE_RESPONSES_CAP + 1);

      if (questionId !== undefined) {
        builder = builder.eq('question_id', questionId);
      }

      const { data, error } = await builder;
      if (error) throw error;

      const rows = (data as DialogueRow[]) ?? [];
      const hasMore = rows.length > DIALOGUE_RESPONSES_CAP;
      const trimmed = hasMore ? rows.slice(0, DIALOGUE_RESPONSES_CAP) : rows;
      return {
        responses: transformRows(trimmed),
        hasMore,
      };
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId,
  });

  const responses = query.data?.responses;
  const hasMore = query.data?.hasMore ?? false;

  // Preserve reference stability for `data` so downstream memos don't churn
  // across renders that return the same responses array.
  const stableData = useMemo(() => responses, [responses]);

  // The inner query types rows as `DialogueResponsesPage`; we remap `data`
  // so external consumers still see `DialogueResponse[]`. The conversion
  // goes through `unknown` because the TanStack Query result is a tagged
  // union keyed on the original row shape.
  return {
    ...query,
    data: stableData,
    hasMore,
    cap: DIALOGUE_RESPONSES_CAP,
  } as unknown as UseDialogueResponsesResult;
}
