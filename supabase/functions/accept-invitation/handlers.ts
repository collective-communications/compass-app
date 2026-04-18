/**
 * Pure-orchestration handlers for accept-invitation.
 *
 * Factored out of index.ts so the GET validation flow, POST acceptance flow,
 * IP rate-limiting, and service-role misconfiguration paths are testable under
 * Bun. The `index.ts` entry composes these with `Deno.serve`, `Deno.env.get`,
 * and `createClient` from esm.sh.
 *
 * All side-effect dependencies are injected via the handler arguments so that
 * tests can stand up a fake Supabase client without pulling esm.sh imports.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AcceptRequest {
  invitationId: string;
  password: string;
  fullName: string;
}

export const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'CC+C Administrator',
  ccc_member: 'CC+C Team Member',
  client_exec: 'Client Executive',
  client_director: 'Client Director',
  client_manager: 'Client Manager',
};

export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const RATE_LIMIT_MAX_ATTEMPTS = 20;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  req: Request,
  error: string,
  message: string,
  status: number,
): Response {
  return jsonResponse(req, { error, message }, status);
}

/**
 * Extract the caller's IP address from request headers.
 *
 * Preference order:
 *   1. `cf-connecting-ip` — set by Cloudflare / Supabase edge gateway; always trustworthy.
 *   2. Rightmost hop of `x-forwarded-for` — the value appended by the last trusted proxy.
 *      Leading hops of `x-forwarded-for` are client-settable and thus spoofable; using
 *      the rightmost hop defeats per-IP rate-limit bypass via injected XFF headers.
 *   3. `x-real-ip` — less common but some deployments set it.
 *   4. Fallback string `'unknown'`.
 */
export function extractClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Rightmost value is the one the last trusted proxy appended.
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Derive a stable SHA-256 hash of the caller's IP address.
 */
export async function fingerprintIp(req: Request): Promise<string> {
  const clientIp = extractClientIp(req);

  const buf = new TextEncoder().encode(clientIp);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidInvitation {
  id: string;
  email: string;
  role: string;
  organization_id: string | null;
  expires_at: string;
  organizationName: string | null;
}

export async function loadAndValidateInvitation(
  client: SupabaseClient,
  invitationId: string,
  req: Request,
): Promise<{ invitation: ValidInvitation } | { error: Response }> {
  const { data: invitation, error: invError } = await client
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invError || !invitation) {
    return {
      error: errorResponse(
        req,
        'INVALID_INVITATION',
        'This invitation link is not valid. It may have already been used or revoked.',
        404,
      ),
    };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return {
      error: errorResponse(
        req,
        'EXPIRED_INVITATION',
        'This invitation has expired. Please ask your administrator to send a new one.',
        410,
      ),
    };
  }

  let organizationName: string | null = null;
  if (invitation.organization_id) {
    const { data: org } = await client
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();
    organizationName = (org?.name as string | undefined) ?? null;
  }

  return {
    invitation: {
      id: invitation.id as string,
      email: invitation.email as string,
      role: invitation.role as string,
      organization_id: (invitation.organization_id as string | null) ?? null,
      expires_at: invitation.expires_at as string,
      organizationName,
    },
  };
}

// ─── Rate-limit helpers ─────────────────────────────────────────────────────

export async function isRateLimited(
  client: SupabaseClient,
  ipHash: string,
): Promise<boolean> {
  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000,
  ).toISOString();

  const { count, error } = await client
    .from('invitation_validation_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if (error) {
    // Fail closed on DB error.
    // eslint-disable-next-line no-console
    console.error('Rate-limit query failed:', error.message);
    return true;
  }

  return (count ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS;
}

export async function findValidationGrant(
  client: SupabaseClient,
  invitationId: string,
  ipHash: string,
): Promise<{ id: string; valid_until: string; attempts: number } | null> {
  const { data, error } = await client
    .from('invitation_validation_tokens')
    .select('id, valid_until, attempts')
    .eq('invitation_id', invitationId)
    .eq('ip_hash', ipHash)
    .gt('valid_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Validation grant lookup failed:', error.message);
    return null;
  }

  return (data as { id: string; valid_until: string; attempts: number } | null) ?? null;
}

// ─── GET: Validate ──────────────────────────────────────────────────────────

export async function handleGet(
  client: SupabaseClient,
  req: Request,
  url: URL,
): Promise<Response> {
  const token = url.searchParams.get('token');
  if (!token) {
    return errorResponse(req, 'INVALID_REQUEST', 'token query parameter is required', 400);
  }

  const ipHash = await fingerprintIp(req);

  if (await isRateLimited(client, ipHash)) {
    return errorResponse(
      req,
      'RATE_LIMITED',
      'Too many invitation attempts from this network. Please wait a few minutes and try again.',
      429,
    );
  }

  const result = await loadAndValidateInvitation(client, token, req);
  if ('error' in result) return result.error;

  const { invitation } = result;

  const { error: insertError } = await client
    .from('invitation_validation_tokens')
    .insert({
      invitation_id: invitation.id,
      ip_hash: ipHash,
    });

  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to record validation token:', insertError.message);
  }

  return jsonResponse(req, {
    valid: true,
    email: invitation.email,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
    organizationName: invitation.organizationName,
    expiresAt: invitation.expires_at,
  });
}

// ─── POST: Accept ───────────────────────────────────────────────────────────

export async function handlePost(
  client: SupabaseClient,
  req: Request,
): Promise<Response> {
  let body: AcceptRequest;
  try {
    body = await req.json();
    if (!body.invitationId || !body.password || !body.fullName) {
      return errorResponse(
        req,
        'INVALID_REQUEST',
        'invitationId, password, and fullName are required',
        400,
      );
    }
  } catch {
    return errorResponse(req, 'INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  if (body.password.length < 12) {
    return errorResponse(req, 'WEAK_PASSWORD', 'Password must be at least 12 characters', 400);
  }

  const ipHash = await fingerprintIp(req);

  if (await isRateLimited(client, ipHash)) {
    return errorResponse(
      req,
      'RATE_LIMITED',
      'Too many invitation attempts from this network. Please wait a few minutes and try again.',
      429,
    );
  }

  const grant = await findValidationGrant(client, body.invitationId, ipHash);
  if (!grant) {
    return errorResponse(
      req,
      'VALIDATION_REQUIRED',
      'Please open the invitation link again before submitting.',
      429,
    );
  }

  await client
    .from('invitation_validation_tokens')
    .update({ attempts: grant.attempts + 1 })
    .eq('id', grant.id);

  const result = await loadAndValidateInvitation(client, body.invitationId, req);
  if ('error' in result) return result.error;

  const { invitation } = result;

  // Look up the existing auth user via user_profiles rather than scanning the
  // full admin.listUsers() page. A case-insensitive match on email hits the
  // partial unique index `user_profiles_email_idx` on LOWER(email). If the
  // profile points at an auth row that has since been hard-deleted,
  // getUserById returns { user: null } and we fall through to the
  // new-user creation path.
  const { data: profileRow, error: profileLookupError } = await client
    .from('user_profiles')
    .select('id')
    .ilike('email', invitation.email)
    .maybeSingle();

  if (profileLookupError) {
    // eslint-disable-next-line no-console
    console.error('Failed to look up user profile by email:', profileLookupError.message);
    return errorResponse(
      req,
      'LOOKUP_FAILED',
      'Failed to verify account. Please try again.',
      500,
    );
  }

  let existingUser: { id: string; email?: string } | null = null;
  if (profileRow?.id) {
    const { data: userData } = await client.auth.admin.getUserById(profileRow.id);
    existingUser = (userData?.user as { id: string; email?: string } | null) ?? null;
  }

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await client.auth.admin.createUser({
      email: invitation.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName },
    });

    if (createError || !newUser?.user) {
      // eslint-disable-next-line no-console
      console.error('Failed to create user:', createError?.message);
      return errorResponse(req, 'CREATE_USER_FAILED', 'Failed to create account. Please try again.', 500);
    }

    userId = newUser.user.id;
  }

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
    // eslint-disable-next-line no-console
    console.error('Failed to create user profile:', profileError.message);
    return errorResponse(req, 'PROFILE_FAILED', 'Account created but profile setup failed. Please contact support.', 500);
  }

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
      // eslint-disable-next-line no-console
      console.error('Failed to create org membership:', memberError.message);
      return errorResponse(
        req,
        'MEMBERSHIP_FAILED',
        'Account created but organization access failed. Please contact support.',
        500,
      );
    }
  }

  await client
    .from('invitations')
    .delete()
    .eq('id', body.invitationId);

  await client
    .from('invitation_validation_tokens')
    .delete()
    .eq('invitation_id', body.invitationId);

  return jsonResponse(req, {
    success: true,
    email: invitation.email,
    isExistingUser: !!existingUser,
  });
}
