import { createAdminClient } from './helpers/db';

/**
 * Runs before the entire test suite.
 * Verifies that Supabase is reachable with the configured credentials.
 */
export default async function globalSetup(): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('organizations').select('id').limit(1);

  if (error) {
    throw new Error(
      `Global setup failed — cannot reach Supabase.\n` +
        `  Error: ${error.message}\n` +
        `  Check E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY env vars.`,
    );
  }
}
