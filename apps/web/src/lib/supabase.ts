import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { optionalEnv } from '@compass/utils';
import type { Database } from './database.types';

let _client: SupabaseClient<Database> | null = null;

/** Read the anon credentials, throwing a friendly error when they're absent. */
function anonCredentials(): { url: string; key: string } {
  const url = optionalEnv('VITE_SUPABASE_URL', '');
  const key = optionalEnv('VITE_SUPABASE_ANON_KEY', '');
  if (!url || !key) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local and fill in your Supabase cloud credentials.',
    );
  }
  return { url, key };
}

/**
 * Lazily initialized Supabase client.
 * Defers initialization so the app can render without env vars
 * (auth features will be non-functional until configured).
 */
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    if (!_client) {
      const { url, key } = anonCredentials();
      _client = createClient<Database>(url, key);
    }
    return Reflect.get(_client, prop, receiver);
  },
});

/**
 * Build a per-request Supabase client that sends an `x-session-token` header
 * alongside every query. Anonymous SELECT/UPDATE policies on `responses` and
 * `answers` require this header to match the session's `session_token`
 * (see migration `00000000000039_rls_session_token_fix.sql`). Without it,
 * anon reads return empty and anon updates no-op, breaking survey resume.
 *
 * Also disables session persistence and auto-refresh so a stale auth token
 * from a prior admin login in the same browser tab can never trigger a
 * refresh-token failure loop during an anonymous survey response.
 *
 * @param sessionToken - the respondent's `session_token` (== `response.id`)
 * @returns a short-lived SupabaseClient configured for one respondent session
 */
export function surveySessionClient(sessionToken: string): SupabaseClient<Database> {
  const { url, key } = anonCredentials();
  return createClient<Database>(url, key, {
    global: { headers: { 'x-session-token': sessionToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
