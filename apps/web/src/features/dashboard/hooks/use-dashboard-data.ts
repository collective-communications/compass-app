/**
 * Combined TanStack Query hook for the client dashboard.
 * Fetches surveys and deployments for the authenticated user's organization,
 * splits them into active vs. previous (closed) buckets.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Survey, Deployment, SurveyStatus } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveSurvey {
  survey: Survey;
  deployment: Deployment | null;
  responseCount: number;
  expectedCount: number;
  completionPercent: number;
  daysRemaining: number | null;
}

export interface PreviousSurvey {
  survey: Survey;
  responseCount: number;
  closedAt: string | null;
}

export interface DashboardData {
  activeSurvey: ActiveSurvey | null;
  previousSurveys: PreviousSurvey[];
}

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: (orgId: string) => [...dashboardKeys.all, 'data', orgId] as const,
};

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchDashboardData(organizationId: string): Promise<DashboardData> {
  // Fetch surveys, response counts, AND deployments in a single round trip.
  // Previously the deployment row was fetched in a second sequential call
  // after the active survey was identified — folding it into the survey
  // select as a nested relation eliminates that round trip entirely. Closed
  // surveys also get their deployments joined, but those are ignored below.
  const { data: surveys, error: surveysError } = await supabase
    .from('surveys')
    .select('*, responses:responses(count), deployments(*)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'closed'] satisfies SurveyStatus[])
    .order('created_at', { ascending: false });

  if (surveysError) throw surveysError;

  const activeSurveyRow = (surveys ?? []).find(
    (s: Record<string, unknown>) => s.status === 'active',
  );
  const closedSurveyRows = (surveys ?? []).filter(
    (s: Record<string, unknown>) => s.status === 'closed',
  );

  let activeSurvey: ActiveSurvey | null = null;

  if (activeSurveyRow) {
    // Deployment comes from the joined `deployments` array on the survey row.
    // The schema allows multiple deployments per survey; we take the first
    // to preserve the prior `.limit(1)` behaviour.
    const deploymentRows = (activeSurveyRow as Record<string, unknown>).deployments as
      | Record<string, unknown>[]
      | undefined;
    const deployment = deploymentRows?.[0] ?? null;
    const responseCount = extractCount(activeSurveyRow);
    // max_responses lives as a top-level column on deployments; there is no
    // deployments.settings JSON column in the current schema.
    const expectedCount = (deployment?.max_responses as number | null | undefined) ?? 0;
    const completionPercent =
      expectedCount > 0 ? Math.round((responseCount / expectedCount) * 100) : 0;

    let daysRemaining: number | null = null;
    if (activeSurveyRow.closes_at) {
      const diffMs = new Date(activeSurveyRow.closes_at as string).getTime() - Date.now();
      daysRemaining = diffMs <= 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    activeSurvey = {
      survey: mapSurvey(activeSurveyRow),
      deployment: deployment ? mapDeployment(deployment) : null,
      responseCount,
      expectedCount,
      completionPercent,
      daysRemaining,
    };
  }

  const previousSurveys: PreviousSurvey[] = closedSurveyRows.map(
    (row: Record<string, unknown>) => ({
      survey: mapSurvey(row),
      responseCount: extractCount(row),
      closedAt: (row.closes_at as string) ?? null,
    }),
  );

  return { activeSurvey, previousSurveys };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractCount(row: Record<string, unknown>): number {
  const responses = row.responses as { count: number }[] | undefined;
  return responses?.[0]?.count ?? 0;
}

/** Map snake_case DB row to camelCase Survey */
function mapSurvey(row: Record<string, unknown>): Survey {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as SurveyStatus,
    opensAt: (row.opens_at as string) ?? null,
    closesAt: (row.closes_at as string) ?? null,
    settings: (row.settings as Survey['settings']) ?? null,
    scoresCalculated: (row.scores_calculated as boolean) ?? false,
    scoresCalculatedAt: (row.scores_calculated_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string,
  };
}

/** Map snake_case DB row to camelCase Deployment */
function mapDeployment(row: Record<string, unknown>): Deployment {
  // The deployments table has `max_responses` as a top-level column and does
  // not store a `settings` JSON blob; synthesize the legacy settings shape
  // from the known columns so the domain type keeps its shape.
  const maxResponses = (row.max_responses as number | null | undefined) ?? null;
  return {
    id: row.id as string,
    surveyId: row.survey_id as string,
    type: row.type as Deployment['type'],
    token: row.token as string,
    settings: {
      maxResponses,
      recipientEmail: null,
      allowMultiple: false,
    },
    closesAt: (row.closes_at as string) ?? null,
    accessCount: (row.access_count as number) ?? 0,
    lastAccessedAt: (row.last_accessed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseDashboardDataOptions {
  organizationId: string | null;
  enabled?: boolean;
}

export interface UseDashboardDataResult {
  activeSurvey: ActiveSurvey | null;
  previousSurveys: PreviousSurvey[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches all dashboard data for a client organization.
 * Returns the currently active survey (if any) and a list of previous (closed) surveys.
 */
export function useDashboardData({
  organizationId,
  enabled = true,
}: UseDashboardDataOptions): UseDashboardDataResult {
  const query: UseQueryResult<DashboardData> = useQuery({
    queryKey: dashboardKeys.data(organizationId ?? ''),
    queryFn: () => fetchDashboardData(organizationId!),
    enabled: enabled && !!organizationId,
    // Dashboard data rarely changes mid-session — hold the cache fresh for
    // 5 minutes (STALE_TIMES.results) and keep it in memory for 10 minutes
    // so remounts (e.g. navigating away and back) don't refetch.
    staleTime: STALE_TIMES.results,
    gcTime: 10 * 60 * 1000,
  });

  return {
    activeSurvey: query.data?.activeSurvey ?? null,
    previousSurveys: query.data?.previousSurveys ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
