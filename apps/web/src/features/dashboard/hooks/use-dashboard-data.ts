/**
 * Combined TanStack Query hook for the client dashboard.
 * Fetches surveys and deployments for the authenticated user's organization,
 * splits them into active vs. previous (closed) buckets.
 *
 * Response counts are only materialised for ccc_* roles because the
 * `responses` table RLS (see migrations/00000000000004_rls_policies.sql)
 * blocks all client_* roles from the responses aggregate. For client roles
 * we skip the responses query entirely and return `null` counts — callers
 * are responsible for rendering a placeholder (e.g. `—`).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Survey, Deployment, SurveyStatus, UserRole } from '@compass/types';
import type { DimensionScoreMap, DimensionScore } from '@compass/scoring';
import type { DimensionCode } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { STALE_TIMES } from '../../../lib/query-config';
import { useAuthStore } from '../../../stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Row shape for the currently-active survey.
 *
 * `responseCount` is `number | null` — `null` means the caller's role cannot
 * read the `responses` table (RLS blocks all client_* roles). Renderers must
 * display a placeholder (e.g. `—`) for null values rather than a misleading `0`.
 */
export interface ActiveSurvey {
  survey: Survey;
  deployment: Deployment | null;
  responseCount: number | null;
  expectedCount: number;
  completionPercent: number;
  daysRemaining: number | null;
}

/**
 * Row shape for a closed (previous) survey. See {@link ActiveSurvey} for the
 * `responseCount: number | null` semantics.
 */
export interface PreviousSurvey {
  survey: Survey;
  responseCount: number | null;
  closedAt: string | null;
}

export interface DashboardData {
  activeSurvey: ActiveSurvey | null;
  previousSurveys: PreviousSurvey[];
}

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  /**
   * Include role in the key because a role switch (e.g. impersonation in dev)
   * changes whether response counts are materialised. Two users in the same
   * org at different roles must not share the same cached payload.
   */
  data: (orgId: string, role: UserRole | 'anonymous') =>
    [...dashboardKeys.all, 'data', orgId, role] as const,
  scores: (surveyId: string) =>
    [...dashboardKeys.all, 'scores', surveyId] as const,
};

// ─── Fetcher ────────────────────────────────────────────────────────────────

/**
 * Determine whether the caller may query the `responses` table directly.
 * Role check mirrors RLS: ccc_admin / ccc_member are allowed; client_* are blocked.
 */
function canReadResponses(role: UserRole | undefined): boolean {
  return role === 'ccc_admin' || role === 'ccc_member';
}

async function fetchDashboardData(
  organizationId: string,
  role: UserRole | undefined,
): Promise<DashboardData> {
  // Step 1 — survey + deployment in a single round trip. The `responses`
  // aggregate was previously folded in here, but that join fails with an RLS
  // error for client_* roles, which makes the entire dashboard unrenderable.
  // Splitting it out means the survey/deployment fetch always succeeds and
  // we only talk to `responses` when the caller is actually allowed to.
  const { data: surveys, error: surveysError } = await supabase
    .from('surveys')
    .select('*, deployments(*)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'closed'] satisfies SurveyStatus[])
    .order('created_at', { ascending: false });

  if (surveysError) {
    throw new Error(
      `dashboard: surveys load failed: ${surveysError.code ?? 'unknown'}: ${surveysError.message}${
        surveysError.hint ? ` (hint: ${surveysError.hint})` : ''
      }`,
    );
  }

  const rows = surveys ?? [];

  // Step 2 — response counts, only when the caller's role can read `responses`.
  // For client_* roles we leave `responseCount` as null and downstream UI
  // renders a placeholder instead. For ccc_* roles we issue one count-only
  // query per survey in parallel; counts return via the `count` header so the
  // payload is empty (head: true, count: 'exact').
  const responseCounts = new Map<string, number>();
  if (canReadResponses(role) && rows.length > 0) {
    const surveyIds = rows.map((s: Record<string, unknown>) => s.id as string);
    const countResults = await Promise.all(
      surveyIds.map(async (surveyId) => {
        const { count, error } = await supabase
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .eq('survey_id', surveyId);
        if (error) {
          throw new Error(
            `dashboard: response count load failed for survey ${surveyId}: ${
              error.code ?? 'unknown'
            }: ${error.message}${error.hint ? ` (hint: ${error.hint})` : ''}`,
          );
        }
        return [surveyId, count ?? 0] as const;
      }),
    );
    for (const [id, count] of countResults) {
      responseCounts.set(id, count);
    }
  }

  const activeSurveyRow = rows.find(
    (s: Record<string, unknown>) => s.status === 'active',
  );
  const closedSurveyRows = rows.filter(
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
    const surveyId = activeSurveyRow.id as string;
    const responseCount = canReadResponses(role)
      ? responseCounts.get(surveyId) ?? 0
      : null;
    // max_responses lives as a top-level column on deployments; there is no
    // deployments.settings JSON column in the current schema.
    const expectedCount = (deployment?.max_responses as number | null | undefined) ?? 0;
    const completionPercent =
      responseCount !== null && expectedCount > 0
        ? Math.round((responseCount / expectedCount) * 100)
        : 0;

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
    (row: Record<string, unknown>) => {
      const surveyId = row.id as string;
      return {
        survey: mapSurvey(row),
        responseCount: canReadResponses(role) ? responseCounts.get(surveyId) ?? 0 : null,
        closedAt: (row.closes_at as string) ?? null,
      };
    },
  );

  return { activeSurvey, previousSurveys };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    reminderSchedule: Array.isArray(row.reminder_schedule)
      ? (row.reminder_schedule as number[])
      : [],
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

// ─── Scores Fetcher ─────────────────────────────────────────────────────────

interface SafeSegmentScoreRow {
  survey_id: string;
  segment_type: string;
  segment_value: string;
  dimension_code: string;
  score: number;
  raw_score: number;
  response_count: number;
}

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

async function fetchDashboardScores(surveyId: string): Promise<DimensionScoreMap> {
  const { data, error } = await supabase
    .from('safe_segment_scores')
    .select('*')
    .eq('survey_id', surveyId)
    .eq('segment_type', 'overall');

  if (error) {
    throw new Error(
      `dashboard: scores load failed: ${error.code ?? 'unknown'}: ${error.message}${
        error.hint ? ` (hint: ${error.hint})` : ''
      }`,
    );
  }

  return transformToScoreMap(data as SafeSegmentScoreRow[]);
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
  scores: DimensionScoreMap | null;
  scoresLoading: boolean;
  /** Manually re-run the underlying query (e.g. from an error-state retry button). */
  refetch: () => void;
}

/**
 * Fetches all dashboard data for a client organization.
 * Returns the currently active survey (if any) and a list of previous (closed) surveys.
 * When the active survey has `scoresCalculated === true`, also fetches dimension scores.
 *
 * `responseCount` on rows is `null` for client_* roles because RLS blocks
 * them from the `responses` table; callers render a placeholder in that case.
 */
export function useDashboardData({
  organizationId,
  enabled = true,
}: UseDashboardDataOptions): UseDashboardDataResult {
  const role = useAuthStore((s) => s.user?.role);

  const query: UseQueryResult<DashboardData> = useQuery({
    queryKey: dashboardKeys.data(organizationId ?? '', role ?? 'anonymous'),
    queryFn: () => fetchDashboardData(organizationId!, role),
    enabled: enabled && !!organizationId,
    // Dashboard data rarely changes mid-session — hold the cache fresh for
    // 5 minutes (STALE_TIMES.results) and keep it in memory for 10 minutes
    // so remounts (e.g. navigating away and back) don't refetch.
    staleTime: STALE_TIMES.results,
    gcTime: 10 * 60 * 1000,
  });

  const activeSurvey = query.data?.activeSurvey ?? null;
  const scoresEnabled =
    enabled && (activeSurvey?.survey.scoresCalculated ?? false) && !!activeSurvey?.survey.id;

  const scoresQuery: UseQueryResult<DimensionScoreMap> = useQuery({
    queryKey: dashboardKeys.scores(activeSurvey?.survey.id ?? ''),
    queryFn: () => fetchDashboardScores(activeSurvey!.survey.id),
    enabled: scoresEnabled,
    staleTime: STALE_TIMES.results,
    gcTime: 10 * 60 * 1000,
  });

  return {
    activeSurvey,
    previousSurveys: query.data?.previousSurveys ?? [],
    isLoading: query.isLoading,
    error: query.error,
    scores: scoresQuery.data ?? null,
    scoresLoading: scoresQuery.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}
