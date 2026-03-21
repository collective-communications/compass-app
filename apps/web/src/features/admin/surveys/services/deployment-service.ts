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
import { mapSurveyRow, mapDeploymentRow } from '../../../../lib/mappers/survey-mappers';

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

/** Parameters for publishing (activating) a survey */
export interface PublishSurveyParams {
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

/** Publish a survey: set status to active and create a deployment record */
export async function publishSurvey(params: PublishSurveyParams): Promise<Deployment> {
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

/** Unpublish a survey (close it early) */
export async function unpublishSurvey(
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
    .update({ closes_at: new Date().toISOString() })
    .eq('id', deploymentId);

  if (deployError) throw deployError;
}

/** Archive a survey (soft-delete: sets status to 'archived' and records timestamp) */
export async function archiveSurvey(surveyId: string): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'archived' as SurveyStatus, archived_at: new Date().toISOString() })
    .eq('id', surveyId);

  if (error) throw error;
}

/** Unarchive a survey (restore to 'closed' status) */
export async function unarchiveSurvey(surveyId: string): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'closed' as SurveyStatus, archived_at: null })
    .eq('id', surveyId);

  if (error) throw error;
}

// ─── Response Tracking ──────────────────────────────────────────────────────

/** Fetch aggregated response metrics for a survey (queries via deployments → responses) */
export async function getResponseMetrics(surveyId: string): Promise<ResponseMetrics> {
  // Responses reference deployment_id, not survey_id — resolve deployment IDs first
  const { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('id')
    .eq('survey_id', surveyId);

  if (depError) throw depError;

  const deploymentIds = (deployments ?? []).map((d) => d.id as string);
  if (deploymentIds.length === 0) {
    return {
      totalResponses: 0,
      completedResponses: 0,
      completionRate: 0,
      averageCompletionTimeMs: null,
      departmentBreakdown: [],
      dailyCompletions: [],
    };
  }

  const { data: responses, error } = await supabase
    .from('responses')
    .select('id, submitted_at, is_complete, created_at, metadata_department')
    .in('deployment_id', deploymentIds);

  if (error) throw error;

  const rows = responses ?? [];
  const totalResponses = rows.length;
  const completedRows = rows.filter(
    (r) => (r as Record<string, unknown>)['is_complete'] === true,
  );
  const completedResponses = completedRows.length;
  const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

  // Average completion time (submitted_at - created_at)
  let averageCompletionTimeMs: number | null = null;
  if (completedRows.length > 0) {
    const durations = completedRows
      .filter((r) => (r as Record<string, unknown>)['submitted_at'] != null)
      .map((r) => {
        const raw = r as Record<string, unknown>;
        const created = new Date(raw['created_at'] as string).getTime();
        const submitted = new Date(raw['submitted_at'] as string).getTime();
        return submitted - created;
      });
    averageCompletionTimeMs =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  }

  // Department breakdown (metadata_department is a flat column, not JSONB)
  const deptCounts = new Map<string, number>();
  for (const r of rows) {
    const raw = r as Record<string, unknown>;
    const dept = (raw['metadata_department'] as string) ?? 'Unknown';
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
  }
  const departmentBreakdown: DepartmentBreakdown[] = Array.from(deptCounts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // Daily completions (by submitted_at date)
  const dailyCounts = new Map<string, number>();
  for (const r of completedRows) {
    const raw = r as Record<string, unknown>;
    const submittedAt = raw['submitted_at'] as string | null;
    if (!submittedAt) continue;
    const date = submittedAt.slice(0, 10);
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
 * Subscribe to new response inserts for a deployment.
 * Returns an unsubscribe function.
 */
export function subscribeToResponses(
  deploymentId: string,
  onInsert: () => void,
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`responses:deployment_id=eq.${deploymentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `deployment_id=eq.${deploymentId}`,
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