/**
 * Edge function for sending survey invitation emails to recipients.
 * Loads recipients with status='pending', renders the invitation template,
 * sends via send-email function, and updates recipient status.
 *
 * Orchestration lives in `handler.ts` so the flow is testable under Bun
 * without the Deno runtime.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';
import { sendInvitations } from './handler.ts';

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendInvitationsRequest {
  surveyId: string;
  deploymentId: string;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-invitations' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;

  // Parse body
  let body: SendInvitationsRequest;
  try {
    body = await req.json();
    if (!body.surveyId || !body.deploymentId) {
      return errorResponse('INVALID_REQUEST', 'surveyId and deploymentId are required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectiveculturecompass.com';

  try {
    const result = await sendInvitations(client, {
      surveyId: body.surveyId,
      deploymentId: body.deploymentId,
      appUrl,
    });
    return jsonResponse(result.body, result.status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('SEND_INVITATIONS_FAILED', message, 500);
  }
});
