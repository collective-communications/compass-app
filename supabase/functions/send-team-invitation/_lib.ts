/**
 * Pure utility functions for the send-team-invitation edge function.
 * No Deno APIs or esm.sh imports — pure TypeScript only.
 *
 * See `supabase/functions/send-invitations/_lib.ts` for the authoritative
 * documentation. Duplicated here because Deno edge functions can't share
 * modules across directories without a publish step.
 */

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize a URL before interpolating it into an email template's `href`.
 *
 * Rules:
 *   - `javascript:`, `data:`, `vbscript:`, `file:` (case-insensitive, ignoring
 *     leading whitespace) are rejected outright.
 *   - `https://` is always allowed.
 *   - `http://` is only allowed when the caller flags the environment as
 *     non-production via `allowInsecure: true`.
 *   - The result is HTML-escaped so the URL cannot break out of the attribute.
 *
 * If the URL is rejected, the HTML-escaped `fallback` is returned instead.
 * Callers should pass their canonical `APP_URL` as the fallback.
 */
export function sanitizeUrl(
  url: string,
  options: { fallback?: string; allowInsecure?: boolean } = {},
): string {
  const fallback = options.fallback ?? '';
  const allowInsecure = options.allowInsecure ?? false;

  if (typeof url !== 'string' || url.length === 0) {
    return escapeHtml(fallback);
  }

  // eslint-disable-next-line no-control-regex -- intentional: matching C0 controls is the defense
  const trimmed = url.replace(/^[\s\u0000-\u001F]+/, '');
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return escapeHtml(fallback);
  }

  if (lower.startsWith('https://')) {
    return escapeHtml(trimmed);
  }

  if (lower.startsWith('http://') && allowInsecure) {
    return escapeHtml(trimmed);
  }

  return escapeHtml(fallback);
}

/**
 * Replace `{{key}}` placeholders in a template string.
 *
 * SECURITY: values are inserted verbatim with no HTML escaping. Callers MUST
 * pass already-safe values — use `escapeHtml(userInput)` for any user- or
 * org-controllable string, and `sanitizeUrl(url, { fallback })` for any URL
 * interpolated into an `href`. See `send-team-invitation/handler.ts` for the
 * canonical pattern.
 */
export function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

/** Map role codes to display labels for the rendered email copy. */
export const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'CC+C Administrator',
  ccc_member: 'CC+C Team Member',
  client_exec: 'Client Executive',
  client_director: 'Client Director',
  client_manager: 'Client Manager',
};
