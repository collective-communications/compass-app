/**
 * TanStack Query hook for fetching per-question score distributions.
 * Supports optional filtering by dimension.
 * Includes sub-dimension metadata from the question_scores view.
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
  response_count: number;
  is_reverse_scored: boolean;
  sub_dimension_code: string | null;
  sub_dimension_name: string | null;
  /** Distribution columns: dist_1 through dist_10 from the view. */
  dist_1: number;
  dist_2: number;
  dist_3: number;
  dist_4: number;
  dist_5: number;
  dist_6: number;
  dist_7: number;
  dist_8: number;
  dist_9: number;
  dist_10: number;
}

/**
 * Build a LikertDistribution from the flat dist_N columns.
 * Only includes keys where count > 0, plus all keys up to the max non-zero key.
 * This allows consumers to infer scale size from the distribution keys.
 */
function buildDistribution(row: QuestionScoreDbRow): LikertDistribution {
  const columns: number[] = [
    row.dist_1, row.dist_2, row.dist_3, row.dist_4, row.dist_5,
    row.dist_6, row.dist_7, row.dist_8, row.dist_9, row.dist_10,
  ];

  // Find the highest value that has any responses to determine scale size
  let maxKey = 4; // minimum assumption: 4-point scale
  for (let i = columns.length - 1; i >= 0; i--) {
    if ((columns[i] ?? 0) > 0) {
      maxKey = i + 1;
      break;
    }
  }

  const dist: LikertDistribution = {};
  for (let i = 0; i < maxKey; i++) {
    dist[i + 1] = columns[i] ?? 0;
  }
  return dist;
}

function transformRows(rows: QuestionScoreDbRow[]): QuestionScoreRow[] {
  return rows.map((row) => ({
    questionId: row.question_id,
    questionText: row.question_text,
    dimensionCode: row.dimension_code as DimensionCode,
    meanScore: row.mean_score,
    distribution: buildDistribution(row),
    responseCount: row.response_count,
    isReverseScored: row.is_reverse_scored,
    subDimensionCode: row.sub_dimension_code ?? null,
    subDimensionName: row.sub_dimension_name ?? null,
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
