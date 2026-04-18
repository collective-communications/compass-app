/**
 * Shared CORS helpers for Supabase Edge Functions.
 *
 * All edge functions called from the browser must use `corsHeaders(req)` so the
 * caller's `Origin` is validated against an explicit allowlist — the previous
 * wildcard (`*`) let any origin call authenticated endpoints from a browser.
 *
 * Allowlist sources (in order):
 *   1. `APP_URL`              — primary origin (e.g. https://app.collectiveculturecompass.com)
 *   2. `APP_URL_EXTRA`        — comma-separated additional origins for staging/preview
 *   3. `http://localhost:42333` — ONLY when `ENVIRONMENT=development` and the above are unset
 *
 * A request is considered allowed only when its `Origin` header matches one of
 * the allowlisted values. When it does not match, `Access-Control-Allow-Origin`
 * is omitted entirely (the browser will then block the response). `Vary: Origin`
 * is always set so caches key responses by origin.
 *
 * Handlers should use `corsHeaders(req)` for all responses, including preflight:
 *
 *   if (req.method === 'OPTIONS') {
 *     return new Response('ok', { headers: corsHeaders(req) });
 *   }
 *
 *   return new Response(JSON.stringify(body), {
 *     status,
 *     headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
 *   });
 */

const STATIC_HEADERS: Readonly<Record<string, string>> = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  // `Vary: Origin` tells caches the response depends on the request Origin —
  // must be set whether or not the origin was allowed.
  Vary: 'Origin',
};

/**
 * Compute the current allowlist from environment variables.
 * Returns an empty array when no origin is configured and we are NOT in
 * development mode — callers should treat this as "reject everything".
 */
function getAllowlist(): string[] {
  const appUrl = Deno.env.get('APP_URL')?.trim();
  const appUrlExtra = Deno.env.get('APP_URL_EXTRA')?.trim();
  const environment = Deno.env.get('ENVIRONMENT')?.trim().toLowerCase();

  const origins = new Set<string>();

  if (appUrl) origins.add(appUrl);

  if (appUrlExtra) {
    for (const raw of appUrlExtra.split(',')) {
      const trimmed = raw.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  // Fallback for local development only.
  if (origins.size === 0 && environment === 'development') {
    origins.add('http://localhost:42333');
  }

  return Array.from(origins);
}

/**
 * Build CORS headers for the given request.
 *
 * Echoes the caller's `Origin` in `Access-Control-Allow-Origin` only when it
 * matches the configured allowlist. Otherwise the header is omitted and the
 * browser will block the response.
 *
 * Returns a plain object so callers can use spread syntax when composing
 * response headers:
 *
 *   headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
 */
export function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { ...STATIC_HEADERS };

  const origin = req.headers.get('Origin');
  if (origin) {
    const allowlist = getAllowlist();
    if (allowlist.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      // Allow cookies / Authorization on requests from allowlisted origins.
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

