/**
 * generate-report — Supabase Edge Function
 *
 * Assembles survey data into a report (format determined by the report
 * record), uploads it to storage, and returns a signed download URL.
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
 *     "fileSize":    number,  // Rendered file size in bytes
 *     "generatedBy": string   // UUID of the authenticated user
 *   }
 *
 * Error responses:
 *   400 — INVALID_REQUEST   (missing or invalid reportId)
 *   403 — FORBIDDEN         (caller is not a member of the report's org)
 *   404 — NOT_FOUND         (report does not exist)
 *   405 — METHOD_NOT_ALLOWED
 *   409 — INVALID_STATE     (report is not in "queued" status)
 *   500 — GENERATION_FAILED (rendering or upload error; report marked "failed")
 *
 * Orchestration lives in `handler.ts` so the flow is testable under Bun
 * without the Deno runtime.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authorize } from './auth.ts';
import { generateReport } from './handler.ts';

// ─── JSON Response Helpers ─────────────────────────────────────────────────

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  req: Request,
  error: string,
  message: string,
  status: number,
): Response {
  return jsonResponse(req, { error, message }, status);
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse(req, { status: 'ok', function: 'generate-report' });
  }

  // Only POST
  if (req.method !== 'POST') {
    return errorResponse(req, 'METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Parse request body
  let reportId: string;
  try {
    const body = await req.json();
    reportId = body.reportId;

    if (!reportId || typeof reportId !== 'string') {
      return errorResponse(req, 'INVALID_REQUEST', 'reportId is required', 400);
    }
  } catch {
    return errorResponse(req, 'INVALID_REQUEST', 'Request body must be valid JSON with reportId', 400);
  }

  // Create Supabase client with service_role for full access
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize the caller
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;
  const { userId, role } = authResult.result;

  const result = await generateReport(client, {
    reportId,
    caller: { userId, role },
  });

  return jsonResponse(req, result.body, result.status);
});
