/**
 * Combined TanStack Query hook for the client dashboard.
 * Fetches surveys and deployments for the authenticated user's organization,
 * splits them into active vs. previous (closed) buckets.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Survey, Deployment, SurveyStatus } from '@compass/types';
import { supabase } from '../../../lib/supabase';

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
  // Fetch surveys with response counts for this organization
  const { data: surveys, error: surveysError } = await supabase
    .from('surveys')
    .select('*, responses:responses(count)')
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
    // Fetch the deployment for the active survey
    const { data: deployments, error: depError } = await supabase
      .from('deployments')
      .select('*')
      .eq('survey_id', activeSurveyRow.id)
      .limit(1);

    if (depError) throw depError;

    const deployment = deployments?.[0] ?? null;
    const responseCount = extractCount(activeSurveyRow);
    const expectedCount = deployment?.settings?.maxResponses ?? 0;
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
  return {
    id: row.id as string,
    surveyId: row.survey_id as string,
    type: row.type as Deployment['type'],
    token: row.token as string,
    settings: (row.settings as Deployment['settings']) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
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
  });

  return {
    activeSurvey: query.data?.activeSurvey ?? null,
    previousSurveys: query.data?.previousSurveys ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
