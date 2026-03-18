/**
 * generate-report — Supabase Edge Function
 *
 * Assembles survey data into a branded HTML report, uploads it to storage,
 * and returns a signed download URL.
 *
 * HTTP Method: POST (GET returns a health-check response)
 *
 * Request body:
 *   {
 *     "reportId": string  // UUID of a report record in "queued" status
 *   }
 *
 * Requires: Authorization header with a valid Supabase access token.
 *
 * Success response (200):
 *   {
 *     "reportId":    string,  // The report UUID
 *     "status":      "completed",
 *     "storagePath": string,  // Path within the "reports" storage bucket
 *     "signedUrl":   string,  // 24-hour signed download URL
 *     "generatedBy": string   // UUID of the authenticated user
 *   }
 *
 * Error responses:
 *   400 — INVALID_REQUEST   (missing or invalid reportId)
 *   404 — NOT_FOUND         (report does not exist)
 *   405 — METHOD_NOT_ALLOWED
 *   409 — INVALID_STATE     (report is not in "queued" status)
 *   500 — GENERATION_FAILED (rendering or upload error; report marked "failed")
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';
import { loadReport, updateReportStatus } from './db.ts';
import { assembleReportPayload } from './assemble.ts';
import { renderReportHtml } from './render-html.ts';

// ─── Storage Helpers ──────────────────────────────────────────────────────

/** Upload a PDF to the reports storage bucket and return a signed URL. */
async function uploadReportPdf(
  client: SupabaseClient,
  reportId: string,
  orgId: string,
  pdfBuffer: Uint8Array,
): Promise<{ storagePath: string; signedUrl: string; fileSize: number }> {
  const storagePath = `${orgId}/${reportId}.html`;

  const { error: uploadError } = await client.storage
    .from('reports')
    .upload(storagePath, pdfBuffer, {
      contentType: 'text/html',
      upsert: true,
    });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: signedData, error: signedError } = await client.storage
    .from('reports')
    .createSignedUrl(storagePath, 86400); // 24h expiry
  if (signedError) throw new Error(`Signed URL creation failed: ${signedError.message}`);

  return {
    storagePath,
    signedUrl: signedData.signedUrl,
    fileSize: pdfBuffer.byteLength,
  };
}

// ─── JSON Response Helpers ─────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'generate-report' });
  }

  // Only POST
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Parse request body
  let reportId: string;
  try {
    const body = await req.json();
    reportId = body.reportId;

    if (!reportId || typeof reportId !== 'string') {
      return errorResponse('INVALID_REQUEST', 'reportId is required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON with reportId', 400);
  }

  // Create Supabase client with service_role for full access
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize the caller
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;
  const { userId } = authResult.result;

  try {
    // Load report record
    const report = await loadReport(client, reportId);
    if (!report) {
      return errorResponse('NOT_FOUND', `Report ${reportId} not found`, 404);
    }

    // Guard: only queued reports can be generated
    if (report.status !== 'queued') {
      return errorResponse(
        'INVALID_STATE',
        `Report is in "${report.status}" state; only "queued" reports can be generated`,
        409,
      );
    }

    // Mark as generating
    await updateReportStatus(client, reportId, 'generating');

    // Assemble report data from survey scores, segments, recommendations
    const payload = await assembleReportPayload(client, report.survey_id);

    // Render to self-contained HTML (PDF conversion is a future infra task)
    const html = renderReportHtml(payload, report);

    // Convert HTML string to bytes for upload
    const encoder = new TextEncoder();
    const htmlBuffer = encoder.encode(html);

    // Upload to storage (.html until real PDF conversion is wired)
    const { storagePath, signedUrl, fileSize } = await uploadReportPdf(
      client, reportId, report.organization_id, htmlBuffer,
    );

    // Mark complete
    await updateReportStatus(client, reportId, 'completed', {
      storage_path: storagePath,
      file_url: signedUrl,
      file_size: fileSize,
    });

    return jsonResponse({
      reportId,
      status: 'completed',
      storagePath,
      signedUrl,
      generatedBy: userId,
    });
  } catch (err) {
    // Best-effort: mark report as failed
    try {
      await updateReportStatus(client, reportId, 'failed');
    } catch {
      // Swallow cleanup errors
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('GENERATION_FAILED', message, 500);
  }
});
