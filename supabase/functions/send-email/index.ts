/**
 * Edge function for sending emails via Resend API.
 * Accepts service_role requests only. Logs all sends to email_log table.
 *
 * Uses the RESEND_CCC_SEND (send-only) API key stored as RESEND_API_KEY.
 *
 * Orchestration lives in `handler.ts` so the flow is testable under Bun.
 * This entry preserves the legacy 500 SEND_FAILED envelope on provider
 * errors (see handler.ts `errorMapping: 'legacy'`).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, makeResendProvider, type SendEmailRequest } from './handler.ts';

// ─── Config ──────────────────────────────────────────────────────────────────

const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'noreply@mail.collectiveculturecompass.com';

// ─── JSON Helpers ────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-email' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Authorize: service_role only
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== serviceRoleKey || serviceRoleKey === '') {
    return errorResponse('UNAUTHORIZED', 'Only service_role can invoke send-email', 401);
  }

  // Parse body
  let body: SendEmailRequest;
  try {
    body = await req.json();
    if (!body.to || !body.subject || !body.html || !body.templateType) {
      return errorResponse('INVALID_REQUEST', 'to, subject, html, and templateType are required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const provider = makeResendProvider(apiKey, FROM_ADDRESS);

  const result = await sendEmail(client, body, provider, { errorMapping: 'legacy' });
  return jsonResponse(result.body, result.status);
});
