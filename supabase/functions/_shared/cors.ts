/**
 * Shared CORS headers for Supabase Edge Functions.
 * All edge functions called from the browser must include these headers
 * and handle OPTIONS preflight requests.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
