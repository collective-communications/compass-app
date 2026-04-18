import { createAdminClient } from './db';

/**
 * Test helpers for setting up and tearing down report fixtures.
 *
 * These helpers are used by the E2E specs under `e2e/tests/reports/` so each
 * test knows exactly how many reports exist before it runs. Conditional
 * guards (`if (await reportList.isVisible())`) were previously used to tolerate
 * both empty-state and populated-state runs; this helper removes that
 * ambiguity.
 */

/**
 * Deletes every report attached to the given survey. Use in `beforeEach` to
 * establish the empty-state fixture.
 */
export async function deleteAllReports(surveyId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('reports').delete().eq('survey_id', surveyId);
}

export interface SeededReport {
  id: string;
  format: 'pdf' | 'pptx';
  createdAt: string;
}

/**
 * Inserts one ready (`status = 'completed'`) report row visible to clients.
 * Returns the row id so the test can target it by id or clean up later.
 *
 * Fixtures are minimal: no storage object is created, so `storage_path` is
 * populated with a non-null placeholder value only if needed. The row is
 * enough to exercise list rendering, selection, and card metadata.
 */
export async function seedCompletedReport(
  surveyId: string,
  format: 'pdf' | 'pptx' = 'pdf',
): Promise<SeededReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reports')
    .insert({
      survey_id: surveyId,
      format,
      status: 'completed',
      progress: 100,
      file_size: 12_345,
      page_count: 7,
      sections: ['overview', 'key-findings'],
      client_visible: true,
      storage_path: `fixtures/${surveyId}/${Date.now()}.${format}`,
    })
    .select('id, format, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed report: ${error?.message ?? 'no data'}`);
  }

  return {
    id: data.id as string,
    format: data.format as 'pdf' | 'pptx',
    createdAt: data.created_at as string,
  };
}
