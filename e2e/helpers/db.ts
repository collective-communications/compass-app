import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the service-role key (bypasses RLS).
 * Used by test helpers to set up and tear down test data.
 */
export function createAdminClient(): SupabaseClient {
  const url =
    process.env.E2E_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    '';

  const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error(
      'E2E_SUPABASE_SERVICE_KEY is required. Set it in e2e/.env.e2e.local or as an env var.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
