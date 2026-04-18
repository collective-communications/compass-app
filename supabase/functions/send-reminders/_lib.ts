/**
 * Pure utility functions for the send-reminders edge function.
 * No Deno APIs or esm.sh imports — pure TypeScript only.
 */

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Sanitize a URL before interpolating it into an email template's `href`.
 *
 * See `supabase/functions/send-invitations/_lib.ts` for the authoritative
 * documentation. Duplicated here because Deno edge functions can't share
 * modules across directories without a publish step.
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

/** Replace `{{key}}` placeholders in an HTML template string. */
export function renderTemplate(
  html: string,
  variables: Record<string, string>,
): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

/** Calculate whole days between an ISO date string and a Date. */
export function daysBetween(from: string, to: Date): number {
  const fromDate = new Date(from);
  const diffMs = to.getTime() - fromDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Returns true if a reminder was already sent within the last 23 hours. */
export function shouldSkipReminder(lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return false;
  const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
  const lastReminder = new Date(lastSentAt).getTime();
  return now.getTime() - lastReminder < TWENTY_THREE_HOURS_MS;
}
