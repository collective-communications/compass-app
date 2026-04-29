import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Result of authorization check. */
export interface AuthResult {
  authorized: boolean;
  userId: string;
  role: string;
}

/**
 * Authorize a request to trigger score recalculation.
 *
 * Accepts either:
 * - Service role key in the Authorization header (Bearer <service_role_key>)
 * - A valid JWT belonging to a user with the ccc_admin role
 *
 * Returns 401 for missing/invalid credentials, 403 for insufficient role.
 */
export async function authorize(
  req: Request,
  client: SupabaseClient,
): Promise<{ result: AuthResult } | { error: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
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
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  // Look up the user's roles from org_members.
  const { data: memberships, error: memberError } = await client
    .from('org_members')
    .select('role')
    .eq('user_id', user.id);

  if (memberError || !memberships || memberships.length === 0) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'User org membership not found' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  const authorizedRole = memberships.find((membership) => membership.role === 'ccc_admin')?.role;
  if (!authorizedRole) {
    return {
      error: new Response(
        JSON.stringify({ error: 'FORBIDDEN', message: 'Only ccc_admin users can trigger scoring' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  return {
    result: { authorized: true, userId: user.id, role: authorizedRole },
  };
}
