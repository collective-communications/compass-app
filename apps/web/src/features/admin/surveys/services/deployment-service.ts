/**
 * Supabase queries for survey deployment and response tracking.
 * Handles deployment CRUD, activation, response metrics, and realtime subscriptions.
 */

import type {
  Survey,
  SurveySettings,
  Deployment,
  DeploymentType,
  SurveyStatus,
} from '@compass/types';
import { supabase } from '../../../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Parameters for creating or updating a survey's deployment config */
export interface SaveSurveyConfigParams {
  surveyId: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  settings: Partial<SurveySettings>;
}

/** Parameters for deploying (activating) a survey */
export interface DeploySurveyParams {
  surveyId: string;
  deploymentType: DeploymentType;
}

/** Daily completion data point */
export interface DailyCompletion {
  date: string;
  count: number;
}

/** Department-level response breakdown */
export interface DepartmentBreakdown {
  department: string;
  count: number;
}

/** Aggregated response metrics for a survey */
export interface ResponseMetrics {
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averageCompletionTimeMs: number | null;
  departmentBreakdown: DepartmentBreakdown[];
  dailyCompletions: DailyCompletion[];
}

// ─── Survey Config ──────────────────────────────────────────────────────────

/** Save survey configuration (title, dates, settings) without deploying */
export async function saveSurveyConfig(params: SaveSurveyConfigParams): Promise<Survey> {
  const { surveyId, title, description, opensAt, closesAt, settings } = params;

  const { data, error } = await supabase
    .from('surveys')
    .update({
      title,
      description,
      opens_at: opensAt,
      closes_at: closesAt,
      settings,
    })
    .eq('id', surveyId)
    .select('*')
    .single();

  if (error) throw error;

  return mapSurveyRow(data as Record<string, unknown>);
}

// ─── Deployment ─────────────────────────────────────────────────────────────

/** Deploy a survey: set status to active and create a deployment record */
export async function deploySurvey(params: DeploySurveyParams): Promise<Deployment> {
  const { surveyId, deploymentType } = params;

  // Generate a URL-safe token
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Update survey status to active
  const { error: statusError } = await supabase
    .from('surveys')
    .update({ status: 'active' as SurveyStatus })
    .eq('id', surveyId);

  if (statusError) throw statusError;

  // Create deployment record
  const { data, error } = await supabase
    .from('deployments')
    .insert({
      survey_id: surveyId,
      type: deploymentType,
      token,
    })
    .select('*')
    .single();

  if (error) throw error;

  return mapDeploymentRow(data as Record<string, unknown>);
}

/** Fetch the active deployment for a survey */
export async function getActiveDeployment(surveyId: string): Promise<Deployment | null> {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapDeploymentRow(data as Record<string, unknown>);
}

/** Deactivate a deployment (close survey early) */
export async function deactivateDeployment(
  surveyId: string,
  deploymentId: string,
): Promise<void> {
  const { error: surveyError } = await supabase
    .from('surveys')
    .update({ status: 'closed' as SurveyStatus })
    .eq('id', surveyId);

  if (surveyError) throw surveyError;

  const { error: deployError } = await supabase
    .from('deployments')
    .update({ expires_at: new Date().toISOString() })
    .eq('id', deploymentId);

  if (deployError) throw deployError;
}

// ─── Response Tracking ──────────────────────────────────────────────────────

/** Fetch aggregated response metrics for a survey */
export async function getResponseMetrics(surveyId: string): Promise<ResponseMetrics> {
  const { data: responses, error } = await supabase
    .from('responses')
    .select('id, completed_at, created_at, metadata')
    .eq('survey_id', surveyId);

  if (error) throw error;

  const rows = responses ?? [];
  const totalResponses = rows.length;
  const completedRows = rows.filter(
    (r) => (r as Record<string, unknown>)['completed_at'] !== null,
  );
  const completedResponses = completedRows.length;
  const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

  // Average completion time (completed_at - created_at)
  let averageCompletionTimeMs: number | null = null;
  if (completedRows.length > 0) {
    const durations = completedRows.map((r) => {
      const raw = r as Record<string, unknown>;
      const created = new Date(raw['created_at'] as string).getTime();
      const completed = new Date(raw['completed_at'] as string).getTime();
      return completed - created;
    });
    averageCompletionTimeMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  // Department breakdown
  const deptCounts = new Map<string, number>();
  for (const r of rows) {
    const raw = r as Record<string, unknown>;
    const meta = raw['metadata'] as Record<string, unknown> | null;
    const dept = (meta?.['department'] as string) ?? 'Unknown';
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
  }
  const departmentBreakdown: DepartmentBreakdown[] = Array.from(deptCounts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // Daily completions
  const dailyCounts = new Map<string, number>();
  for (const r of completedRows) {
    const raw = r as Record<string, unknown>;
    const date = (raw['completed_at'] as string).slice(0, 10);
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }
  const dailyCompletions: DailyCompletion[] = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalResponses,
    completedResponses,
    completionRate,
    averageCompletionTimeMs,
    departmentBreakdown,
    dailyCompletions,
  };
}

// ─── Score Recalculation ────────────────────────────────────────────────────

/** Trigger score recalculation via the score-survey Edge Function */
export async function triggerScoreRecalculation(surveyId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('score-survey', {
    body: { surveyId },
  });

  if (error) throw error;
}

// ─── Realtime ───────────────────────────────────────────────────────────────

/**
 * Subscribe to new response inserts for a survey.
 * Returns an unsubscribe function.
 */
export function subscribeToResponses(
  surveyId: string,
  onInsert: () => void,
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`responses:survey_id=eq.${surveyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `survey_id=eq.${surveyId}`,
      },
      () => {
        onInsert();
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ─── Row Mappers ────────────────────────────────────────────────────────────

function mapSurveyRow(raw: Record<string, unknown>): Survey {
  return {
    id: raw['id'] as string,
    organizationId: raw['organization_id'] as string,
    title: raw['title'] as string,
    description: (raw['description'] as string) ?? null,
    status: raw['status'] as Survey['status'],
    opensAt: (raw['opens_at'] as string) ?? null,
    closesAt: (raw['closes_at'] as string) ?? null,
    settings: (raw['settings'] as Survey['settings']) ?? null,
    scoresCalculated: (raw['scores_calculated'] as boolean) ?? false,
    scoresCalculatedAt: (raw['scores_calculated_at'] as string) ?? null,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    createdBy: raw['created_by'] as string,
  };
}

function mapDeploymentRow(raw: Record<string, unknown>): Deployment {
  return {
    id: raw['id'] as string,
    surveyId: raw['survey_id'] as string,
    type: raw['type'] as Deployment['type'],
    token: raw['token'] as string,
    settings: (raw['settings'] as Deployment['settings']) ?? null,
    expiresAt: (raw['expires_at'] as string) ?? null,
    accessCount: (raw['access_count'] as number) ?? 0,
    lastAccessedAt: (raw['last_accessed_at'] as string) ?? null,
    createdAt: raw['created_at'] as string,
  };
}
