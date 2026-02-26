/**
 * TanStack Query hook for fetching segment-filtered dimension scores.
 * Queries the safe_segment_scores view which enforces anonymity thresholds.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DimensionCode } from '@compass/types';
import type { DimensionScore } from '@compass/scoring';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';
import type { DimensionScoreRow } from '../types';

interface SafeSegmentScoreRow {
  survey_id: string;
  segment_type: string;
  segment_value: string;
  dimension_code: string;
  score: number;
  raw_score: number;
  response_count: number;
}

function transformRows(rows: SafeSegmentScoreRow[]): DimensionScoreRow[] {
  return rows.map((row) => ({
    surveyId: row.survey_id,
    segmentType: row.segment_type,
    segmentValue: row.segment_value,
    dimensionCode: row.dimension_code as DimensionCode,
    score: row.score,
    rawScore: row.raw_score,
    responseCount: row.response_count,
  }));
}

export interface UseSegmentScoresOptions {
  surveyId: string;
  segmentType: string;
  segmentValue?: string;
}

export function useSegmentScores({
  surveyId,
  segmentType,
  segmentValue,
}: UseSegmentScoresOptions): UseQueryResult<DimensionScoreRow[]> {
  return useQuery({
    queryKey: resultKeys.segmentScores(surveyId, segmentType, segmentValue),
    queryFn: async () => {
      let query = supabase
        .from('safe_segment_scores')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('segment_type', segmentType);

      if (segmentValue !== undefined) {
        query = query.eq('segment_value', segmentValue);
      }

      const { data, error } = await query;
      if (error) throw error;
      return transformRows(data as SafeSegmentScoreRow[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId && !!segmentType,
  });
}
