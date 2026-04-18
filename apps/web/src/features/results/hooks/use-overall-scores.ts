/**
 * TanStack Query hook for fetching overall dimension scores.
 * Queries the safe_segment_scores view filtered to the 'overall' segment.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreMap, DimensionScore } from '@compass/scoring';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';

interface SafeSegmentScoreRow {
  survey_id: string;
  segment_type: string;
  segment_value: string;
  dimension_code: string;
  score: number;
  raw_score: number;
  response_count: number;
}

/** Transform raw rows into a DimensionScoreMap keyed by dimension code. */
function transformToScoreMap(rows: SafeSegmentScoreRow[]): DimensionScoreMap {
  const map = {} as Record<string, DimensionScore>;

  for (const row of rows) {
    map[row.dimension_code] = {
      dimensionId: row.dimension_code,
      dimensionCode: row.dimension_code as DimensionCode,
      score: row.score,
      rawScore: row.raw_score,
      responseCount: row.response_count,
    };
  }

  return map as DimensionScoreMap;
}

/**
 * Fetch the overall (unfiltered) dimension score map for a survey.
 * Reads from `safe_segment_scores` filtered to the 'overall' segment;
 * the view enforces the anonymity threshold server-side.
 *
 * @param surveyId - Target survey. When empty the query is disabled.
 * @returns TanStack query result whose data is a `DimensionScoreMap` keyed by `DimensionCode`.
 */
export function useOverallScores(surveyId: string): UseQueryResult<DimensionScoreMap> {
  return useQuery({
    queryKey: resultKeys.overallScores(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safe_segment_scores')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('segment_type', 'overall');

      if (error) throw error;
      return transformToScoreMap(data as SafeSegmentScoreRow[]);
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId,
  });
}
