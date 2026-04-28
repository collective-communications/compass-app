/**
 * TanStack Query hook for fetching email log entries.
 * Read-only view of the `email_log` table, ordered by creation date descending.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

export interface EmailLogEntry {
  id: string;
  recipient: string;
  subject: string;
  templateType: string;
  status: 'queued' | 'sent' | 'failed';
  providerMessageId: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  surveyId: string | null;
}

export interface UseEmailLogOptions {
  status?: string;
  templateType?: string;
}

function fromRow(row: {
  id: string;
  recipient: string;
  subject: string;
  template_type: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  survey_id: string | null;
}): EmailLogEntry {
  return {
    id: row.id,
    recipient: row.recipient,
    subject: row.subject,
    templateType: row.template_type,
    status: row.status as EmailLogEntry['status'],
    providerMessageId: row.provider_message_id,
    error: row.error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    surveyId: row.survey_id,
  };
}

async function fetchEmailLog(options?: UseEmailLogOptions): Promise<EmailLogEntry[]> {
  let query = supabase
    .from('email_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.templateType) {
    query = query.eq('template_type', options.templateType);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ err: error, fn: 'fetchEmailLog' }, 'Failed to fetch email log');
    throw new Error(`Failed to fetch email log: ${error.message}`);
  }

  return (data ?? []).map(fromRow);
}

/**
 * Fetches the email log with optional status and template type filters.
 *
 * @param options - Optional filters for status and template type
 * @returns TanStack query result containing the filtered email log entries
 */
export function useEmailLog(options?: UseEmailLogOptions): UseQueryResult<EmailLogEntry[]> {
  return useQuery({
    queryKey: [
      'admin',
      'email-log',
      options?.status ?? 'all',
      options?.templateType ?? 'all',
    ],
    queryFn: () => fetchEmailLog(options),
    staleTime: 30_000,
  });
}
