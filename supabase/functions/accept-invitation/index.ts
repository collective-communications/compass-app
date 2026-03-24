/**
 * Edge function for accepting team member invitations.
 *
 * GET  ?token=UUID  — Validate invitation and return details (no auth required).
 * POST { invitationId, password, fullName } — Create user account, profile,
 *   org membership, and delete the invitation. No auth required (the invitation
 *   token itself is the authorization).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AcceptRequest {
  invitationId: string;
  password: string;
  fullName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'CC+C Administrator',
  ccc_member: 'CC+C Team Member',
  client_exec: 'Client Executive',
  client_director: 'Client Director',
  client_manager: 'Client Manager',
};

// ─── Validation ─────────────────────────────────────────────────────────────

interface ValidInvitation {
  id: string;
  email: string;
  role: string;
  organization_id: string | null;
  expires_at: string;
  organizationName: string | null;
}

async function loadAndValidateInvitation(
  client: ReturnType<typeof createClient>,
  invitationId: string,
): Promise<{ invitation: ValidInvitation } | { error: Response }> {
  const { data: invitation, error: invError } = await client
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invError || !invitation) {
    return {
      error: errorResponse(
        'INVALID_INVITATION',
        'This invitation link is not valid. It may have already been used or revoked.',
        404,
      ),
    };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return {
      error: errorResponse(
        'EXPIRED_INVITATION',
        'This invitation has expired. Please ask your administrator to send a new one.',
        410,
      ),
    };
  }

  // Load org name if applicable
  let organizationName: string | null = null;
  if (invitation.organization_id) {
    const { data: org } = await client
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();
    organizationName = org?.name ?? null;
  }

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organization_id: invitation.organization_id,
      expires_at: invitation.expires_at,
      organizationName,
    },
  };
}

// ─── GET: Validate ──────────────────────────────────────────────────────────

async function handleGet(
  client: ReturnType<typeof createClient>,
  url: URL,
): Promise<Response> {
  const token = url.searchParams.get('token');
  if (!token) {
    return errorResponse('INVALID_REQUEST', 'token query parameter is required', 400);
  }

  const result = await loadAndValidateInvitation(client, token);
  if ('error' in result) return result.error;

  const { invitation } = result;
  return jsonResponse({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
    organizationName: invitation.organizationName,
    expiresAt: invitation.expires_at,
  });
}

// ─── POST: Accept ───────────────────────────────────────────────────────────

async function handlePost(
  client: ReturnType<typeof createClient>,
  req: Request,
): Promise<Response> {
  let body: AcceptRequest;
  try {
    body = await req.json();
    if (!body.invitationId || !body.password || !body.fullName) {
      return errorResponse('INVALID_REQUEST', 'invitationId, password, and fullName are required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  if (body.password.length < 8) {
    return errorResponse('WEAK_PASSWORD', 'Password must be at least 8 characters', 400);
  }

  // Validate invitation
  const result = await loadAndValidateInvitation(client, body.invitationId);
  if ('error' in result) return result.error;

  const { invitation } = result;

  // Check if a user with this email already exists
  const { data: existingUsers } = await client.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === invitation.email.toLowerCase(),
  );

  let userId: string;

  if (existingUser) {
    // User already has an auth account — use their existing ID
    userId = existingUser.id;
  } else {
    // Create user with confirmed email (invitation email IS verification)
    const { data: newUser, error: createError } = await client.auth.admin.createUser({
      email: invitation.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName },
    });

    if (createError) {
      console.error('Failed to create user:', createError.message);
      return errorResponse('CREATE_USER_FAILED', 'Failed to create account. Please try again.', 500);
    }

    userId = newUser.user.id;
  }

  // Upsert user_profile with the invited role
  const { error: profileError } = await client
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        email: invitation.email,
        full_name: body.fullName,
        role: invitation.role,
      },
      { onConflict: 'id' },
    );

  if (profileError) {
    console.error('Failed to create user profile:', profileError.message);
    return errorResponse('PROFILE_FAILED', 'Account created but profile setup failed. Please contact support.', 500);
  }

  // Create org_members entry if this is an org-scoped invitation
  if (invitation.organization_id) {
    const { error: memberError } = await client
      .from('org_members')
      .upsert(
        {
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
        },
        { onConflict: 'organization_id,user_id' },
      );

    if (memberError) {
      console.error('Failed to create org membership:', memberError.message);
      return errorResponse(
        'MEMBERSHIP_FAILED',
        'Account created but organization access failed. Please contact support.',
        500,
      );
    }
  } else {
    // CC+C internal roles: create a membership to the platform org (null org)
    // For CC+C users, org_members needs an org — check if there's a platform org
    // or handle this differently. For now, just ensure profile role is set.
    // The post-login redirect in use-auth.ts falls back to role from user_profiles
    // if no org_members entry exists.
  }

  // Delete the invitation (it's been consumed)
  await client
    .from('invitations')
    .delete()
    .eq('id', body.invitationId);

  return jsonResponse({
    success: true,
    email: invitation.email,
    isExistingUser: !!existingUser,
  });
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);

  if (req.method === 'GET') {
    return handleGet(client, url);
  }

  if (req.method === 'POST') {
    return handlePost(client, req);
  }

  return errorResponse('METHOD_NOT_ALLOWED', 'Only GET/POST/OPTIONS accepted', 405);
});
