import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Report row from the database. */
export interface ReportRow {
  id: string;
  survey_id: string;
  organization_id: string;
  title: string;
  format: string;
  status: string;
  storage_path: string | null;
  client_visible: boolean;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch a report by ID. Returns null if not found. */
export async function loadReport(
  client: SupabaseClient,
  reportId: string,
): Promise<ReportRow | null> {
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(`Failed to load report: ${error.message}`);
  return data as ReportRow;
}

/** Update report status. */
export async function updateReportStatus(
  client: SupabaseClient,
  reportId: string,
  status: 'queued' | 'generating' | 'ready' | 'completed' | 'failed',
  extra?: { storage_path?: string; file_size?: number; error?: string },
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (extra?.storage_path) {
    update.storage_path = extra.storage_path;
  }
  if (extra?.file_size !== undefined) {
    update.file_size = extra.file_size;
  }
  if (extra?.error) {
    update.error = extra.error;
  }

  const { error } = await client
    .from('reports')
    .update(update)
    .eq('id', reportId);

  if (error) throw new Error(`Failed to update report status: ${error.message}`);
}
