/**
 * Edge function for accepting team member invitations.
 *
 * GET  ?token=UUID
 *   Validates the invitation and — on success — writes a short-lived
 *   `invitation_validation_tokens` row keyed by (invitation_id, ip_hash) so a
 *   subsequent POST from the same IP within 15 minutes is eligible for
 *   acceptance. Returns invitation details to the caller.
 *
 * POST { invitationId, password, fullName }
 *   Creates the user account, profile, and org membership. Requires a matching
 *   validation row from the GET step. Enforces a trailing-15-minute rate limit
 *   of 20 requests per IP to prevent brute force.
 *
 * No user-level auth is required on either path — the invitation token itself
 * is the authorization. The validation row binds acceptance to the IP that
 * originally fetched the invitation, so a leaked invitation id alone is not
 * sufficient to complete signup from an unrelated network.
 *
 * All orchestration lives in `handlers.ts` so the flows are testable under
 * Bun without the `Deno.*` runtime.
 *
 * @see supabase/migrations/00000000000038_invitation_validation_tokens.sql — validation token table
 * @see supabase/migrations/00000000000039_rls_session_token_fix.sql — session-token RLS binding
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { handleGet, handlePost, errorResponse } from './handlers.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return errorResponse(req, 'CONFIG_ERROR', 'Server misconfigured', 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const url = new URL(req.url);

  if (req.method === 'GET') {
    return handleGet(client, req, url);
  }

  if (req.method === 'POST') {
    return handlePost(client, req);
  }

  return errorResponse(req, 'METHOD_NOT_ALLOWED', 'Only GET/POST/OPTIONS accepted', 405);
});
