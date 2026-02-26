import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { optionalEnv } from '@compass/utils';

let _client: SupabaseClient | null = null;

/**
 * Lazily initialized Supabase client.
 * Defers initialization so the app can render without env vars
 * (auth features will be non-functional until configured).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) {
      const url = optionalEnv('VITE_SUPABASE_URL', '');
      const key = optionalEnv('VITE_SUPABASE_ANON_KEY', '');

      if (!url || !key) {
        console.warn(
          '[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Auth features will not work.',
        );
        _client = createClient('http://localhost:54321', 'placeholder');
      } else {
        _client = createClient(url, key);
      }
    }
    return Reflect.get(_client, prop, receiver);
  },
});
