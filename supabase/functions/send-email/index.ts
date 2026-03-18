/**
 * Edge function for sending emails via Resend API.
 * Accepts service_role requests only. Logs all sends to email_log table.
 *
 * Uses the RESEND_CCC_SEND (send-only) API key stored as RESEND_API_KEY.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ──────────────────────────────────────────────────────────────────

const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'noreply@mail.collectiveculturecompass.com';

// ─── Resend Send ─────────────────────────────────────────────────────────────

interface SendResult {
  messageId: string;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY must be set');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: [replyTo] } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Resend API error ${response.status}:`, err);
    throw new Error('Email delivery failed');
  }

  const data = await response.json() as { id: string };
  return { messageId: data.id };
}

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

// ─── Request Body ────────────────────────────────────────────────────────────

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  templateType: 'survey_invitation' | 'reminder' | 'report_ready';
  replyTo?: string;
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

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Insert queued log entry
  const { data: logEntry, error: logError } = await client
    .from('email_log')
    .insert({
      recipient: body.to,
      subject: body.subject,
      template_type: body.templateType,
      status: 'queued',
    })
    .select('id')
    .single();

  if (logError) {
    return errorResponse('LOG_ERROR', `Failed to create email log: ${logError.message}`, 500);
  }

  const logId = logEntry.id;

  // Send via Resend
  try {
    const { messageId } = await sendViaResend(body.to, body.subject, body.html, body.replyTo);

    // Update log to sent
    await client
      .from('email_log')
      .update({
        status: 'sent',
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', logId);

    return jsonResponse({ success: true, logId, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Update log to failed
    await client
      .from('email_log')
      .update({ status: 'failed', error: message })
      .eq('id', logId);

    return errorResponse('SEND_FAILED', message, 500);
  }
});
