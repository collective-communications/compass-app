/**
 * Hook that loads all historical data required by the Trends tab.
 *
 * Fetches the current survey, all closed/archived surveys for the same org,
 * then fetches overall segment scores for each survey in parallel.
 * Returns a merged, deduplicated list of up to 6 surveys sorted ascending
 * by close date.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { resultKeys } from '../lib/query-keys';

// ─── Public types ────────────────────────────────────────────────────────────

/** A single survey's scores at a point in time, used by the Trends chart. */
export interface SurveyDataPoint {
  surveyId: string;
  title: string;
  closesAt: string;
  isCurrent: boolean;
  /** dimensionCode → 0-100 score. Only present dimensions are keyed. */
  scores: Partial<Record<string, number>>;
}

/** Return shape of {@link useHistoryTab}. */
export interface UseHistoryTabResult {
  /** Surveys sorted ascending by closesAt. */
  surveys: SurveyDataPoint[];
  isLoading: boolean;
  /** `true` when at least two surveys with score data are available. */
  hasEnoughData: boolean;
}

// ─── Internal row types ───────────────────────────────────────────────────────

interface CurrentSurveyRow {
  id: string;
  title: string;
  organization_id: string;
  closes_at: string;
  status: string;
}

interface HistorySurveyRow {
  id: string;
  title: string;
  closes_at: string;
}

interface ScoreRow {
  dimension_code: string;
  score: number;
}

/** Maximum number of surveys to show in the chart. */
const MAX_SURVEYS = 6;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Load all data required for the historical trends tab.
 *
 * @param surveyId - The current (active) survey being viewed.
 * @returns Merged, deduplicated list of up to 6 surveys with scores.
 */
export function useHistoryTab(surveyId: string): UseHistoryTabResult {
  // Step 1 — fetch the current survey metadata
  const currentQuery = useQuery({
    queryKey: resultKeys.historyTab(surveyId),
    queryFn: async (): Promise<CurrentSurveyRow> => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, organization_id, closes_at, status')
        .eq('id', surveyId)
        .single();
      if (error) throw error;
      return data as CurrentSurveyRow;
    },
    staleTime: STALE_TIMES.results,
    enabled: !!surveyId,
  });

  const currentSurvey = currentQuery.data;

  // Step 2 — fetch all closed/archived surveys for the same org (enabled after step 1)
  const historyQuery = useQuery({
    queryKey: [...resultKeys.all, 'orgHistory', currentSurvey?.organization_id ?? ''],
    queryFn: async (): Promise<HistorySurveyRow[]> => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, closes_at')
        .eq('organization_id', currentSurvey!.organization_id)
        .in('status', ['closed', 'archived'])
        .order('closes_at', { ascending: true });
      if (error) throw error;
      return data as HistorySurveyRow[];
    },
    staleTime: STALE_TIMES.results,
    enabled: !!currentSurvey,
  });

  // Step 3 — build the deduplicated, capped list of surveys to fetch scores for
  const surveysForScores: Array<{ id: string; title: string; closesAt: string; isCurrent: boolean }> = buildSurveyList(
    currentSurvey ?? null,
    historyQuery.data ?? null,
  );

  // Step 4 — fetch safe_segment_scores for each survey in parallel
  const scoreQueries = useQueries({
    queries: surveysForScores.map((s) => ({
      queryKey: [...resultKeys.all, 'historyScores', s.id],
      queryFn: async (): Promise<ScoreRow[]> => {
        const { data, error } = await supabase
          .from('safe_segment_scores')
          .select('dimension_code, score')
          .eq('survey_id', s.id)
          .eq('segment_type', 'overall');
        if (error) throw error;
        return data as ScoreRow[];
      },
      staleTime: STALE_TIMES.results,
      enabled: surveysForScores.length > 0,
    })),
  });

  // Step 5 — merge into SurveyDataPoint[], only including surveys with data
  const surveys: SurveyDataPoint[] = surveysForScores.reduce<SurveyDataPoint[]>(
    (acc, survey, idx) => {
      const q = scoreQueries[idx];
      if (!q || q.status !== 'success' || !q.data || q.data.length === 0) {
        return acc;
      }
      const scores: Partial<Record<string, number>> = {};
      for (const row of q.data) {
        scores[row.dimension_code] = row.score;
      }
      acc.push({ surveyId: survey.id, title: survey.title, closesAt: survey.closesAt, isCurrent: survey.isCurrent, scores });
      return acc;
    },
    [],
  );

  const isLoading =
    currentQuery.isLoading ||
    historyQuery.isLoading ||
    scoreQueries.some((q) => q.isLoading);

  return {
    surveys,
    isLoading,
    hasEnoughData: surveys.length >= 2,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the ordered, deduplicated list of surveys to fetch scores for.
 * Includes the current survey exactly once, caps at MAX_SURVEYS most-recent.
 */
function buildSurveyList(
  current: CurrentSurveyRow | null,
  history: HistorySurveyRow[] | null,
): Array<{ id: string; title: string; closesAt: string; isCurrent: boolean }> {
  if (!current) return [];

  const isCurrentClosed = current.status === 'closed' || current.status === 'archived';

  // History already includes closed/archived surveys sorted ascending.
  // If the current survey is also closed/archived it will be in this list — deduplicate.
  const historicalEntries: Array<{ id: string; title: string; closesAt: string; isCurrent: boolean }> =
    (history ?? [])
      .filter((s) => s.id !== current.id)
      .map((s) => ({ id: s.id, title: s.title, closesAt: s.closes_at, isCurrent: false }));

  // Build chronologically ordered list
  const all: Array<{ id: string; title: string; closesAt: string; isCurrent: boolean }> = [];

  if (isCurrentClosed) {
    // Insert current into correct chronological position
    let inserted = false;
    for (const s of historicalEntries) {
      if (!inserted && s.closesAt >= current.closes_at) {
        all.push({ id: current.id, title: current.title, closesAt: current.closes_at, isCurrent: true });
        inserted = true;
      }
      all.push(s);
    }
    if (!inserted) {
      all.push({ id: current.id, title: current.title, closesAt: current.closes_at, isCurrent: true });
    }
  } else {
    // Current survey is not yet closed — append at end
    all.push(...historicalEntries);
    all.push({ id: current.id, title: current.title, closesAt: current.closes_at, isCurrent: true });
  }

  // Cap to the MAX_SURVEYS most recent (tail of the ascending list)
  return all.slice(-MAX_SURVEYS);
}
