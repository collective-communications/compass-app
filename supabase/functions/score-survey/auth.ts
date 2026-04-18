import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  // Look up the user's role from user_profiles.
  // (The table is `user_profiles` — not `users`. The previous lookup always
  // failed with a "relation does not exist" error, making the JWT path dead.)
  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'User profile not found' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  if (profile.role !== 'ccc_admin') {
    return {
      error: new Response(
        JSON.stringify({ error: 'FORBIDDEN', message: 'Only ccc_admin users can trigger scoring' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  return {
    result: { authorized: true, userId: user.id, role: profile.role },
  };
}
