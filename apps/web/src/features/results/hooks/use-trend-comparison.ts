/**
 * Hook that computes per-dimension and overall score deltas between the
 * current survey and the most recent prior survey for the same organization.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resultKeys } from '../lib/query-keys';

export interface TrendData {
  overall: number | null;
  dimensions: Record<string, number | null>;
}

interface ScoreRow {
  survey_id: string;
  dimension_code: string;
  score: number;
}

interface SurveyRow {
  id: string;
  organization_id: string;
  closes_at: string;
}

/**
 * Compute deltas between current and prior score sets.
 * Returns percentage-point differences rounded to one decimal.
 */
function computeDeltas(
  currentScores: ScoreRow[],
  priorScores: ScoreRow[],
): TrendData {
  const priorMap = new Map<string, number>();
  for (const row of priorScores) {
    priorMap.set(row.dimension_code, row.score);
  }

  const dimensions: Record<string, number | null> = {};
  let currentSum = 0;
  let priorSum = 0;
  let matchedCount = 0;

  for (const row of currentScores) {
    const prior = priorMap.get(row.dimension_code);
    if (prior !== undefined) {
      dimensions[row.dimension_code] = Math.round((row.score - prior) * 10) / 10;
      currentSum += row.score;
      priorSum += prior;
      matchedCount++;
    } else {
      dimensions[row.dimension_code] = null;
    }
  }

  const overall =
    matchedCount > 0
      ? Math.round(((currentSum - priorSum) / matchedCount) * 10) / 10
      : null;

  return { overall, dimensions };
}

export function useTrendComparison(
  surveyId: string,
): UseQueryResult<TrendData> {
  return useQuery({
    queryKey: [...resultKeys.all, 'trendComparison', surveyId],
    queryFn: async (): Promise<TrendData> => {
      // Fetch the current survey to get organization and close date
      const { data: currentSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, organization_id, closes_at')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      const survey = currentSurvey as SurveyRow;

      // Find the most recent prior closed/archived survey for the same org
      const { data: priorSurveys, error: priorError } = await supabase
        .from('surveys')
        .select('id')
        .eq('organization_id', survey.organization_id)
        .in('status', ['closed', 'archived'])
        .lt('closes_at', survey.closes_at)
        .order('closes_at', { ascending: false })
        .limit(1);

      if (priorError) throw priorError;

      if (!priorSurveys || priorSurveys.length === 0) {
        return { overall: null, dimensions: {} };
      }

      const priorSurveyId = (priorSurveys[0] as { id: string }).id;

      // Fetch overall scores for both surveys in parallel
      const [currentResult, priorResult] = await Promise.all([
        supabase
          .from('safe_segment_scores')
          .select('survey_id, dimension_code, score')
          .eq('survey_id', surveyId)
          .eq('segment_type', 'overall'),
        supabase
          .from('safe_segment_scores')
          .select('survey_id, dimension_code, score')
          .eq('survey_id', priorSurveyId)
          .eq('segment_type', 'overall'),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (priorResult.error) throw priorResult.error;

      return computeDeltas(
        currentResult.data as ScoreRow[],
        priorResult.data as ScoreRow[],
      );
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!surveyId,
  });
}
