/**
 * TanStack Query hook for fetching open-ended dialogue responses.
 * Supports optional filtering by question.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';
import type { DialogueResponse } from '../types';

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

export function useDialogueResponses({
  surveyId,
  questionId,
}: UseDialogueResponsesOptions): UseQueryResult<DialogueResponse[]> {
  return useQuery({
    queryKey: resultKeys.dialogueResponses(surveyId, questionId),
    queryFn: async () => {
      let query = supabase
        .from('dialogue_responses')
        .select('id, question_id, question_text, response_text, created_at')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (questionId !== undefined) {
        query = query.eq('question_id', questionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return transformRows(data as DialogueRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId,
  });
}
