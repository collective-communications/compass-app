import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Result of authorization check. */
export interface AuthResult {
  authorized: boolean;
  userId: string;
  role: string;
}

/**
 * Authorize a request to send invitations.
 * Accepts service_role key or JWT from ccc_admin/ccc_member users.
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

  // Check service_role key
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (token === serviceRoleKey && serviceRoleKey !== '') {
    return {
      result: { authorized: true, userId: 'service_role', role: 'service_role' },
    };
  }

  // JWT verification
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

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

  const allowedRoles = ['ccc_admin', 'ccc_member'];
  const authorizedRole = memberships.find((membership) => allowedRoles.includes(membership.role))?.role;
  if (!authorizedRole) {
    return {
      error: new Response(
        JSON.stringify({ error: 'FORBIDDEN', message: 'Only CC+C users can send invitations' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  return {
    result: { authorized: true, userId: user.id, role: authorizedRole },
  };
}
