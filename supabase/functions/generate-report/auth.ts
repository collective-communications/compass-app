import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/** Result of authorization check. */
export interface AuthResult {
  authorized: boolean;
  userId: string;
  role: string;
}

function errorResponse(
  req: Request,
  error: string,
  message: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ error, message }),
    { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

/**
 * Authorize a request to generate a report.
 *
 * Accepts either:
 * - Service role key in the Authorization header (Bearer <service_role_key>)
 * - A valid JWT belonging to a user with ccc_admin, ccc_member, or client_exec role
 *
 * Returns 401 for missing/invalid credentials, 403 for insufficient role.
 */
export async function authorize(
  req: Request,
  client: SupabaseClient,
): Promise<{ result: AuthResult } | { error: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: errorResponse(req, 'UNAUTHORIZED', 'Missing Authorization header', 401) };
  }

  const token = authHeader.slice(7);

  // Check if the token matches the service_role key
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (token === serviceRoleKey && serviceRoleKey !== '') {
    return {
      result: { authorized: true, userId: 'service_role', role: 'service_role' },
    };
  }

  // Otherwise, treat as a JWT and verify via Supabase auth
  const { data: { user }, error: authError } = await client.auth.getUser(token);

  if (authError || !user) {
    return { error: errorResponse(req, 'UNAUTHORIZED', 'Invalid or expired token', 401) };
  }

  // Look up the user's role from org_members
  const { data: membership, error: memberError } = await client
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return { error: errorResponse(req, 'UNAUTHORIZED', 'User org membership not found', 401) };
  }

  const allowedRoles = ['ccc_admin', 'ccc_member', 'client_exec'];
  if (!allowedRoles.includes(membership.role)) {
    return {
      error: errorResponse(
        req,
        'FORBIDDEN',
        'Only ccc_admin, ccc_member, or client_exec users can generate reports',
        403,
      ),
    };
  }

  return {
    result: { authorized: true, userId: user.id, role: membership.role },
  };
}
