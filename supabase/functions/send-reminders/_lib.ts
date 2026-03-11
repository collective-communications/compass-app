/**
 * Pure utility functions for the send-reminders edge function.
 * No Deno APIs or esm.sh imports — pure TypeScript only.
 */

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
