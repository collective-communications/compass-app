/**
 * Pure utility functions for the send-invitations edge function.
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
