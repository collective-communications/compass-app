/**
 * Supabase queries for report CRUD operations.
 * Handles creation, status polling, listing, and deletion of report records.
 */

import type { ReportConfig, ReportStatus, ReportFormat } from '@compass/types';
import { supabase } from '../../../lib/supabase';

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Fetch the current status of a report by ID */
export async function getReportStatus(reportId: string): Promise<ReportRow> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) throw error;

  return mapReportRow(data as Record<string, unknown>);
}

/** List all reports for a survey, most recent first */
export async function listReports(surveyId: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapReportRow(row as Record<string, unknown>));
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a new report record with status 'queued' */
export async function createReport(config: ReportConfig): Promise<{ reportId: string }> {
  const includedSectionIds = config.sections
    .filter((s) => s.included)
    .map((s) => s.id);

  const { data, error } = await supabase
    .from('reports')
    .insert({
      survey_id: config.surveyId,
      format: config.format,
      status: 'queued',
      progress: 0,
      sections: includedSectionIds,
    })
    .select('id')
    .single();

  if (error) throw error;

  return { reportId: data.id as string };
}

/** Trigger the generate-report edge function for a queued report */
export async function triggerReportGeneration(reportId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('generate-report', {
    body: { reportId },
  });

  if (error) throw error;
}

/** Delete a report record by ID */
export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
}

// ─── Download ────────────────────────────────────────────────────────────────

/** Generate a time-limited signed URL for downloading a report from Supabase Storage */
export async function getReportDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

// ─── Row Mapper ──────────────────────────────────────────────────────────────

/** Extended report row that includes the storage path for signed URL generation */
export interface ReportRow extends ReportStatus {
  storagePath: string | null;
}

function mapReportRow(raw: Record<string, unknown>): ReportRow {
  return {
    id: raw['id'] as string,
    surveyId: raw['survey_id'] as string,
    format: raw['format'] as ReportFormat,
    status: raw['status'] as ReportStatus['status'],
    progress: (raw['progress'] as number) ?? 0,
    fileUrl: null,
    fileSize: (raw['file_size'] as number) ?? null,
    pageCount: (raw['page_count'] as number) ?? null,
    sections: (raw['sections'] as string[]) ?? [],
    createdAt: raw['created_at'] as string,
    createdBy: (raw['created_by'] as string) ?? '',
    error: (raw['error'] as string) ?? null,
    storagePath: (raw['storage_path'] as string) ?? null,
  };
}
