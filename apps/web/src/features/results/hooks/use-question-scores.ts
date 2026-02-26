/**
 * TanStack Query hook for fetching per-question score distributions.
 * Supports optional filtering by dimension.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';
import type { QuestionScoreRow, LikertDistribution } from '../types';

interface QuestionScoreDbRow {
  question_id: string;
  question_text: string;
  dimension_code: string;
  mean_score: number;
  distribution: LikertDistribution;
  response_count: number;
  is_reverse_scored: boolean;
}

function transformRows(rows: QuestionScoreDbRow[]): QuestionScoreRow[] {
  return rows.map((row) => ({
    questionId: row.question_id,
    questionText: row.question_text,
    dimensionCode: row.dimension_code as DimensionCode,
    meanScore: row.mean_score,
    distribution: row.distribution,
    responseCount: row.response_count,
    isReverseScored: row.is_reverse_scored,
  }));
}

export interface UseQuestionScoresOptions {
  surveyId: string;
  dimensionCode?: string;
}

export function useQuestionScores({
  surveyId,
  dimensionCode,
}: UseQuestionScoresOptions): UseQueryResult<QuestionScoreRow[]> {
  return useQuery({
    queryKey: resultKeys.questionScores(surveyId, dimensionCode),
    queryFn: async () => {
      let query = supabase
        .from('question_scores')
        .select('*')
        .eq('survey_id', surveyId)
        .order('mean_score', { ascending: true });

      if (dimensionCode !== undefined) {
        query = query.eq('dimension_code', dimensionCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return transformRows(data as QuestionScoreDbRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId,
  });
}
