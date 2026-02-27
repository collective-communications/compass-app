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

  // Try to find existing user
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);

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
