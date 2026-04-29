/**
 * Pure orchestration for the generate-report edge function.
 *
 * Factored out of index.ts so the happy-path, cross-org enforcement,
 * not-found, invalid-state, and renderer-failure branches are testable under
 * Bun without esm.sh or Deno.*. The `index.ts` entry composes this with
 * `Deno.serve`, `Deno.env.get`, and the live Supabase client.
 *
 * The renderer side effect is injected via the `renderer` option so tests can
 * stub format rendering and observe failure propagation without standing up
 * the HTML/DOCX/PPTX pipeline.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadReport, updateReportStatus, type ReportRow } from './db.ts';
import { assembleReportPayload, type ReportPayload } from './assemble.ts';
import type { RendererOutput } from './renderer.ts';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape of the resolved auth context passed in by index.ts. */
export interface CallerIdentity {
  userId: string;
  role: string;
}

export interface GenerateReportInput {
  reportId: string;
  caller: CallerIdentity;
}

export type GenerateReportResult =
  | {
      status: 200;
      body: {
        reportId: string;
        status: 'completed';
        storagePath: string;
        signedUrl: string;
        fileSize: number;
        generatedBy: string;
      };
    }
  | {
      status: number;
      body: { error: string; message: string };
    };

/** Render function injected for testability. Defaults to `getRenderer(format)`. */
export type RenderFn = (
  payload: ReportPayload,
  report: ReportRow,
) => Promise<RendererOutput>;

// ─── Constants ──────────────────────────────────────────────────────────────

const STAFF_ROLES = new Set(['ccc_admin', 'ccc_member', 'service_role']);

const DEFAULT_REPORT_SECTIONS: NonNullable<ReportPayload['sections']> = [
  { id: 'cover', label: 'Cover Page', included: true, locked: true },
  { id: 'executive_summary', label: 'Executive Summary', included: true },
  { id: 'compass_overview', label: 'Compass Overview', included: true },
  { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: true },
  { id: 'segment_analysis', label: 'Segment Analysis', included: true },
  { id: 'recommendations', label: 'Recommendations', included: true },
];

// ─── Storage ────────────────────────────────────────────────────────────────

/** Upload a rendered report to the reports storage bucket and return a signed URL. */
async function uploadReport(
  client: SupabaseClient,
  reportId: string,
  orgId: string,
  buffer: Uint8Array,
  contentType: string,
  extension: string,
): Promise<{ storagePath: string; signedUrl: string; fileSize: number }> {
  const storagePath = `${orgId}/${reportId}${extension}`;

  const { error: uploadError } = await client.storage
    .from('reports')
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: signedData, error: signedError } = await client.storage
    .from('reports')
    .createSignedUrl(storagePath, 300); // 5m expiry; callers can request a fresh URL when needed.
  if (signedError) throw new Error(`Signed URL creation failed: ${signedError.message}`);

  return {
    storagePath,
    signedUrl: signedData.signedUrl,
    fileSize: buffer.byteLength,
  };
}

// ─── Cross-org enforcement ──────────────────────────────────────────────────

/**
 * Enforce that the caller is either CC+C staff or a member of the report's
 * organization. This is a second layer of defense beyond the role check in
 * `auth.ts` — that check only verifies role, not that the caller's org
 * matches the report they're trying to generate.
 *
 * Returns null on success, or a `{ status, body }` failure envelope that the
 * caller should return verbatim. CC+C staff and service-role bypass the
 * membership lookup entirely.
 */
async function enforceOrgAccess(
  client: SupabaseClient,
  caller: CallerIdentity,
  reportOrgId: string,
): Promise<null | { status: number; body: { error: string; message: string } }> {
  if (STAFF_ROLES.has(caller.role)) return null;

  const { data: membership } = await client
    .from('org_members')
    .select('organization_id')
    .eq('user_id', caller.userId)
    .maybeSingle();

  const callerOrgId = (membership as { organization_id?: string } | null)?.organization_id;

  if (!callerOrgId || callerOrgId !== reportOrgId) {
    return {
      status: 403,
      body: {
        error: 'FORBIDDEN',
        message: "Caller is not a member of this report's organization",
      },
    };
  }

  return null;
}

/** Attach full section metadata from the report row's selected section IDs. */
function applySelectedSections(
  payload: ReportPayload,
  selectedSectionIds: string[] | null,
): ReportPayload {
  if (!selectedSectionIds || selectedSectionIds.length === 0) {
    return { ...payload, sections: DEFAULT_REPORT_SECTIONS };
  }

  const selected = new Set(selectedSectionIds);
  return {
    ...payload,
    sections: DEFAULT_REPORT_SECTIONS.map((section) => ({
      ...section,
      included: section.locked === true || selected.has(section.id),
    })),
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Execute the generate-report flow for a single report id.
 *
 * Returns a `{ status, body }` pair so the caller (index.ts) can build the
 * exact HTTP response without this module owning response headers.
 *
 * On renderer or storage failure the report row is best-effort marked as
 * `failed` and a 500 envelope is returned.
 */
export async function generateReport(
  client: SupabaseClient,
  input: GenerateReportInput,
  opts: { renderer?: RenderFn } = {},
): Promise<GenerateReportResult> {
  const { reportId, caller } = input;

  // Load report record
  const report = await loadReport(client, reportId);
  if (!report) {
    return {
      status: 404,
      body: { error: 'NOT_FOUND', message: `Report ${reportId} not found` },
    };
  }

  // Cross-org gate: staff bypass, everyone else must share the report's org.
  const orgDenial = await enforceOrgAccess(client, caller, report.organization_id);
  if (orgDenial) return orgDenial;

  // Guard: only queued reports can be generated
  if (report.status !== 'queued') {
    return {
      status: 409,
      body: {
        error: 'INVALID_STATE',
        message: `Report is in "${report.status}" state; only "queued" reports can be generated`,
      },
    };
  }

  try {
    // Mark as generating
    await updateReportStatus(client, reportId, 'generating', { progress: 10 });

    // Assemble report data from survey scores, segments, recommendations
    const assembledPayload = await assembleReportPayload(client, report.survey_id);
    const payload = applySelectedSections(assembledPayload, report.sections);

    // Resolve renderer for the requested format and render to bytes. The
    // default path imports `./renderer.ts` lazily so Bun test runs (which
    // inject `opts.renderer`) don't pull in the DOCX/PPTX esm.sh deps.
    const render: RenderFn =
      opts.renderer ??
      (async (p, r): Promise<RendererOutput> => {
        const { getRenderer } = await import('./renderer.ts');
        return getRenderer(r.format).render(p, r);
      });
    const { buffer, contentType, extension } = await render(payload, report);

    // Upload to storage
    const { storagePath, signedUrl, fileSize } = await uploadReport(
      client,
      reportId,
      report.organization_id,
      buffer,
      contentType,
      extension,
    );

    // Mark complete
    await updateReportStatus(client, reportId, 'completed', {
      storage_path: storagePath,
      file_size: fileSize,
      progress: 100,
      client_visible: true,
    });

    return {
      status: 200,
      body: {
        reportId,
        status: 'completed',
        storagePath,
        signedUrl,
        fileSize,
        generatedBy: caller.userId,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Best-effort: mark report as failed with error message
    try {
      await updateReportStatus(client, reportId, 'failed', { error: message });
    } catch {
      // Swallow cleanup errors
    }

    return {
      status: 500,
      body: { error: 'GENERATION_FAILED', message },
    };
  }
}
