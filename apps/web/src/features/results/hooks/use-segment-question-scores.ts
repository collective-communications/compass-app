/**
 * TanStack Query hook for fetching per-question score distributions
 * filtered by respondent metadata segment (department, role, location, tenure).
 * Returns an anonymity-aware result with an isMasked flag.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';
import type { QuestionScoreRow, LikertDistribution } from '../types';

/** Result shape returned by the segment question scores hook. */
export interface SegmentQuestionScoreResult {
  questions: QuestionScoreRow[];
  isMasked: boolean;
}

interface SegmentQuestionScoreDbRow {
  question_id: string;
  question_text: string;
  order_index: number;
  is_reverse_scored: boolean;
  sub_dimension_code: string | null;
  sub_dimension_name: string | null;
  dimension_id: string;
  dimension_code: string;
  dimension_name: string;
  dimension_color: string;
  response_count: number;
  mean_score: number;
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
  is_masked: boolean;
}

/**
 * Build a LikertDistribution from the flat dist_N columns.
 * Only includes keys where count > 0, plus all keys up to the max non-zero key.
 * This allows consumers to infer scale size from the distribution keys.
 */
function buildDistribution(row: SegmentQuestionScoreDbRow): LikertDistribution {
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

function transformRows(rows: SegmentQuestionScoreDbRow[]): QuestionScoreRow[] {
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

export interface UseSegmentQuestionScoresOptions {
  surveyId: string;
  segmentType: string;
  segmentValue: string;
}

export function useSegmentQuestionScores({
  surveyId,
  segmentType,
  segmentValue,
}: UseSegmentQuestionScoresOptions): UseQueryResult<SegmentQuestionScoreResult> {
  return useQuery({
    queryKey: resultKeys.segmentQuestionScores(surveyId, segmentType, segmentValue),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_segment_question_scores', {
        p_survey_id: surveyId,
        p_segment_type: segmentType,
        p_segment_value: segmentValue,
      });
      if (error) throw error;

      const rows = (data ?? []) as SegmentQuestionScoreDbRow[];
      const firstRow = rows[0];
      const isMasked = firstRow ? firstRow.is_masked : false;

      return {
        questions: transformRows(rows),
        isMasked,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId && !!segmentType && !!segmentValue && segmentValue !== 'all',
  });
}
