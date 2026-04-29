/**
 * capture-analytics - first-party, cookie-free analytics ingestion.
 *
 * The function is intentionally unauthenticated at the Supabase gateway so
 * survey respondents can send aggregate lifecycle events. It performs its own
 * CORS allowlist check, payload validation, and aggregate-only service-role
 * write through `record_analytics_event`.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { captureAnalytics } from './handler.ts';

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method === 'GET') {
    return jsonResponse(req, { status: 'ok', function: 'capture-analytics' });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST/GET accepted',
    }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, {
      error: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  const result = await captureAnalytics(client, body);
  return jsonResponse(req, result.body, result.status);
});
