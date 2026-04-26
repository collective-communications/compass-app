/**
 * IoC adapter for survey recipient CRUD operations.
 * Handles bulk import, listing, removal, and stats aggregation.
 */

import type { SurveyRecipient } from '@compass/types';
import { getClient } from '../runtime';

export interface AddRecipientInput {
  email: string;
  name?: string;
  segmentMetadata?: Record<string, string>;
}

export interface RecipientStats {
  total: number;
  pending: number;
  invited: number;
  completed: number;
  bounced: number;
}

function mapRecipientRow(raw: Record<string, unknown>): SurveyRecipient {
  return {
    id: raw['id'] as string,
    surveyId: raw['survey_id'] as string,
    email: raw['email'] as string,
    name: (raw['name'] as string) ?? null,
    segmentMetadata: (raw['segment_metadata'] as Record<string, string>) ?? {},
    status: raw['status'] as SurveyRecipient['status'],
    invitationSentAt: (raw['invitation_sent_at'] as string) ?? null,
    reminderSentAt: (raw['reminder_sent_at'] as string) ?? null,
    createdAt: raw['created_at'] as string,
  };
}

export async function listRecipients(surveyId: string): Promise<SurveyRecipient[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('survey_recipients')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapRecipientRow(row as Record<string, unknown>));
}

export async function addRecipients(
  surveyId: string,
  recipients: AddRecipientInput[],
): Promise<SurveyRecipient[]> {
  const supabase = getClient();
  const rows = recipients.map((r) => ({
    survey_id: surveyId,
    email: r.email.toLowerCase().trim(),
    name: r.name?.trim() || null,
    segment_metadata: r.segmentMetadata ?? {},
  }));

  const { data, error } = await supabase
    .from('survey_recipients')
    .upsert(rows, { onConflict: 'survey_id,email' })
    .select('*');

  if (error) throw error;

  return (data ?? []).map((row) => mapRecipientRow(row as Record<string, unknown>));
}

export async function removeRecipient(recipientId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('survey_recipients')
    .delete()
    .eq('id', recipientId);

  if (error) throw error;
}

export async function getRecipientStats(surveyId: string): Promise<RecipientStats> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('survey_recipients')
    .select('status')
    .eq('survey_id', surveyId);

  if (error) throw error;

  const rows = data ?? [];
  const stats: RecipientStats = {
    total: rows.length,
    pending: 0,
    invited: 0,
    completed: 0,
    bounced: 0,
  };

  for (const row of rows) {
    const status = (row as Record<string, unknown>)['status'] as string;
    if (status in stats) {
      stats[status as keyof Omit<RecipientStats, 'total'>]++;
    }
  }

  return stats;
}

export async function sendInvitations(
  surveyId: string,
  deploymentId: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const supabase = getClient();
  const { data, error } = await supabase.functions.invoke('send-invitations', {
    body: { surveyId, deploymentId },
  });

  if (error) throw error;

  return data as { sent: number; failed: number; errors: string[] };
}
