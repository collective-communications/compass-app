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
import { getClient, getLogger } from '../runtime';
import { mapSurveyRow, mapDeploymentRow } from '../lib/mappers';

export interface SaveSurveyConfigParams {
  surveyId: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  settings: Partial<SurveySettings>;
  reminderSchedule: number[];
}

export interface PublishSurveyParams {
  surveyId: string;
  deploymentType: DeploymentType;
}

export interface DailyCompletion {
  date: string;
  count: number;
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
}

export interface ResponseMetrics {
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averageCompletionTimeMs: number | null;
  departmentBreakdown: DepartmentBreakdown[];
  dailyCompletions: DailyCompletion[];
}

export async function saveSurveyConfig(params: SaveSurveyConfigParams): Promise<Survey> {
  const supabase = getClient();
  const logger = getLogger();
  const { surveyId, title, description, opensAt, closesAt, settings, reminderSchedule } = params;

  const { data: existing, error: readError } = await supabase
    .from('surveys')
    .select('settings')
    .eq('id', surveyId)
    .single();

  if (readError) {
    logger.error({ err: readError, fn: 'saveSurveyConfig.read', surveyId }, 'Failed to read existing survey settings');
    throw readError;
  }

  const existingSettings =
    existing.settings && typeof existing.settings === 'object' && !Array.isArray(existing.settings)
      ? (existing.settings as Partial<SurveySettings>)
      : {};
  const mergedSettings = { ...existingSettings, ...settings };

  const { data, error } = await supabase
    .from('surveys')
    .update({
      title,
      description,
      opens_at: opensAt,
      closes_at: closesAt,
      settings: mergedSettings,
      reminder_schedule: reminderSchedule,
    })
    .eq('id', surveyId)
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'saveSurveyConfig', surveyId }, 'Failed to save survey config');
    throw error;
  }

  return mapSurveyRow(data);
}

export async function publishSurvey(params: PublishSurveyParams): Promise<Deployment> {
  const supabase = getClient();
  const logger = getLogger();
  const { surveyId, deploymentType } = params;

  const { error: statusError } = await supabase
    .from('surveys')
    .update({ status: 'active' as SurveyStatus })
    .eq('id', surveyId);

  if (statusError) {
    logger.error({ err: statusError, fn: 'publishSurvey.updateStatus', surveyId }, 'Failed to flip survey to active');
    throw statusError;
  }

  const { data, error } = await supabase
    .from('deployments')
    .insert({
      survey_id: surveyId,
      type: deploymentType,
    })
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'publishSurvey.insertDeployment', surveyId, deploymentType }, 'Failed to create deployment record');
    throw error;
  }

  return mapDeploymentRow(data);
}

export async function getActiveDeployment(surveyId: string): Promise<Deployment | null> {
  const supabase = getClient();
  const logger = getLogger();
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, fn: 'getActiveDeployment', surveyId }, 'Failed to fetch active deployment');
    throw error;
  }
  if (!data) return null;

  return mapDeploymentRow(data);
}

export async function unpublishSurvey(
  surveyId: string,
  deploymentId: string,
): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error: surveyError } = await supabase
    .from('surveys')
    .update({ status: 'closed' as SurveyStatus })
    .eq('id', surveyId);

  if (surveyError) {
    logger.error({ err: surveyError, fn: 'unpublishSurvey.closeSurvey', surveyId }, 'Failed to close survey');
    throw surveyError;
  }

  const { error: deployError } = await supabase
    .from('deployments')
    .update({ closes_at: new Date().toISOString() })
    .eq('id', deploymentId);

  if (deployError) {
    logger.error({ err: deployError, fn: 'unpublishSurvey.closeDeployment', deploymentId }, 'Failed to close deployment');
    throw deployError;
  }
}

export async function archiveSurvey(surveyId: string): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'archived' as SurveyStatus, archived_at: new Date().toISOString() })
    .eq('id', surveyId);

  if (error) {
    logger.error({ err: error, fn: 'archiveSurvey', surveyId }, 'Failed to archive survey');
    throw error;
  }
}

export async function unarchiveSurvey(surveyId: string): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'closed' as SurveyStatus, archived_at: null })
    .eq('id', surveyId);

  if (error) {
    logger.error({ err: error, fn: 'unarchiveSurvey', surveyId }, 'Failed to unarchive survey');
    throw error;
  }
}

interface ResponseMetricsRpcPayload {
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averageCompletionTimeMs: number | null;
  departmentBreakdown: DepartmentBreakdown[];
  dailyCompletions: DailyCompletion[];
}

interface ResponseMetricsRow {
  id: string;
  submitted_at: string | null;
  is_complete: boolean;
  created_at: string;
  metadata_department: string | null;
}

export async function getResponseMetrics(surveyId: string): Promise<ResponseMetrics> {
  const supabase = getClient();
  const logger = getLogger();
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_response_metrics', {
    p_survey_id: surveyId,
  });

  if (!rpcError && rpcData) {
    const payload = rpcData as unknown as ResponseMetricsRpcPayload;
    return {
      totalResponses: payload.totalResponses ?? 0,
      completedResponses: payload.completedResponses ?? 0,
      completionRate: payload.completionRate ?? 0,
      averageCompletionTimeMs: payload.averageCompletionTimeMs ?? null,
      departmentBreakdown: payload.departmentBreakdown ?? [],
      dailyCompletions: payload.dailyCompletions ?? [],
    };
  }

  logger.warn(
    { err: rpcError, fn: 'getResponseMetrics.rpc', surveyId },
    'RPC get_response_metrics unavailable; falling back to client-side aggregation',
  );

  const { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('id')
    .eq('survey_id', surveyId);

  if (depError) throw depError;

  const deploymentIds = (deployments ?? []).map((d: { id: string }) => d.id);
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

  const rows = (responses ?? []) as ResponseMetricsRow[];
  const totalResponses = rows.length;
  const completedRows = rows.filter((r) => r.is_complete === true);
  const completedResponses = completedRows.length;
  const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

  let averageCompletionTimeMs: number | null = null;
  if (completedRows.length > 0) {
    const durations = completedRows
      .filter((r) => r.submitted_at != null)
      .map((r) => {
        const created = new Date(r.created_at).getTime();
        const submitted = new Date(r.submitted_at as string).getTime();
        return submitted - created;
      });
    averageCompletionTimeMs =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  }

  const deptCounts = new Map<string, number>();
  for (const r of rows) {
    const dept = r.metadata_department ?? 'Unknown';
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
  }
  const departmentBreakdown: DepartmentBreakdown[] = Array.from(deptCounts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const dailyCounts = new Map<string, number>();
  for (const r of completedRows) {
    const submittedAt = r.submitted_at;
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

export async function triggerScoreRecalculation(surveyId: string): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error } = await supabase.functions.invoke('score-survey', {
    body: { surveyId },
  });

  if (error) {
    logger.error({ err: error, fn: 'triggerScoreRecalculation', surveyId }, 'Failed to invoke score-survey function');
    throw error;
  }
}

export function subscribeToResponses(
  deploymentId: string,
  onInsert: () => void,
): { unsubscribe: () => void } {
  const supabase = getClient();
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
