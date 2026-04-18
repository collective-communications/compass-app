/**
 * Edge function for sending team member invitation emails.
 * Called by the frontend after creating or resending an invitation.
 *
 * Orchestration lives in `handler.ts` so the flow is testable under Bun
 * without the Deno runtime. This file handles only the Deno-runtime shell:
 * CORS, auth, request parsing, and shaping the HTTP response envelope.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendTeamInvitation } from './handler.ts';

// ─── JSON Helpers ────────────────────────────────────────────────────────────

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

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  // Health check
  if (req.method === 'GET') {
    return jsonResponse(req, { status: 'ok', function: 'send-team-invitation' });
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 'METHOD_NOT_ALLOWED', 'Only POST/GET/OPTIONS accepted', 405);
  }

  // Create Supabase client with service_role for DB access + calling send-email
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Hard-reject misconfigured deployments where the service-role key is missing.
  // Prevents the previous failure mode where an empty configured key would
  // accept any JWT as "service role" — a privilege escalation in empty-secret
  // environments.
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return errorResponse(req, 'CONFIG_ERROR', 'Server misconfigured', 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize: verify caller is service-role, ccc_admin, or ccc_member
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(req, 'UNAUTHORIZED', 'Missing Authorization header', 401);
  }

  const token = authHeader.slice(7);
  const isServiceRole = token === serviceRoleKey;

  if (!isServiceRole) {
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return errorResponse(req, 'UNAUTHORIZED', 'Invalid or expired token', 401);
    }

    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse(req, 'UNAUTHORIZED', 'User profile not found', 401);
    }

    if (!['ccc_admin', 'ccc_member'].includes(profile.role)) {
      return errorResponse(req, 'FORBIDDEN', 'Only CC+C users can send team invitations', 403);
    }
  }

  // Parse body
  let body: { invitationId?: string };
  try {
    body = await req.json();
    if (!body.invitationId) {
      return errorResponse(req, 'INVALID_REQUEST', 'invitationId is required', 400);
    }
  } catch {
    return errorResponse(req, 'INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectiveculturecompass.com';

  try {
    const result = await sendTeamInvitation(
      client,
      { invitationId: body.invitationId },
      { appUrl },
    );
    return jsonResponse(req, result.body, result.status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse(req, 'SEND_TEAM_INVITATION_FAILED', message, 500);
  }
});
