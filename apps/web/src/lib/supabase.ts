import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@compass/utils';

const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
