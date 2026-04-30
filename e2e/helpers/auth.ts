import { createAdminClient } from './db';

interface TestUser {
  id: string;
  email: string;
}

/**
 * Ensures a test user exists with the given email, role, and org membership.
 * Reuses the existing user if the email is already registered.
 */
export async function ensureTestUser(
  email: string,
  role: 'ccc_admin' | 'ccc_member' | 'client_exec' | 'client_director' | 'client_manager' | 'client_user',
  orgId: string,
  password = 'Test1234!',
): Promise<TestUser> {
  const supabase = createAdminClient();

  // Paginated lookup — listUsers() defaults to 50 per page, which is now
  // smaller than the dev seed's user count. Walk pages until we find the
  // email or exhaust the list.
  let found: { id: string; email?: string } | undefined;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers page ${page} failed: ${error.message}`);
    const match = data?.users?.find((u) => u.email === email);
    if (match) {
      found = match;
      break;
    }
    if (!data?.users || data.users.length < 200) break;
  }

  let userId: string;

  if (found) {
    userId = found.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user ${email}: ${error?.message}`);
    }

    userId = data.user.id;
  }

  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      email,
      role,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw new Error(`Failed to upsert user_profiles: ${profileError.message}`);
  }

  // Upsert org_members row
  const { error: memberError } = await supabase.from('org_members').upsert(
    {
      user_id: userId,
      organization_id: orgId,
      role,
    },
    { onConflict: 'organization_id,user_id' },
  );

  if (memberError) {
    throw new Error(`Failed to upsert org_members: ${memberError.message}`);
  }

  return { id: userId, email };
}
