/**
 * Edge function for sending emails via AWS SES.
 * Accepts service_role requests only. Logs all sends to email_log table.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.18';

// ─── Config ──────────────────────────────────────────────────────────────────

const SES_REGION = Deno.env.get('AWS_SES_REGION') ?? 'us-east-1';
const FROM_ADDRESS = Deno.env.get('SES_FROM_ADDRESS') ?? 'noreply@collectivecommunication.ca';

// ─── SES Client ──────────────────────────────────────────────────────────────

function createAwsClient(): AwsClient {
  const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY must be set');
  }

  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: SES_REGION,
  });
}

// ─── SES Send ────────────────────────────────────────────────────────────────

interface SendResult {
  messageId: string;
}

async function sendViaSes(
  aws: AwsClient,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<SendResult> {
  const endpoint = `https://email.${SES_REGION}.amazonaws.com/v2/email/outgoing-emails`;
  const body = {
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
    },
    Destination: { ToAddresses: [to] },
    FromEmailAddress: FROM_ADDRESS,
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
  };

  const response = await aws.fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SES error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return { messageId: data.MessageId };
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

  // Send via SES
  try {
    const aws = createAwsClient();
    const { messageId } = await sendViaSes(aws, body.to, body.subject, body.html, body.replyTo);

    // Update log to sent
    await client
      .from('email_log')
      .update({
        status: 'sent',
        ses_message_id: messageId,
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
