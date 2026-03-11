/**
 * Pure utility functions for the generate-report edge function.
 * No Deno APIs or esm.sh imports — pure TypeScript only.
 */

/** Brand color palette used for dimension mapping. */
export const BRAND = {
  core: '#0A3B4F',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
} as const;

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Map a dimension code to its brand color. Falls back to BRAND.core. */
export function getDimensionColor(code: string): string {
  const map: Record<string, string> = {
    clarity: BRAND.clarity,
    connection: BRAND.connection,
    collaboration: BRAND.collaboration,
    culture: BRAND.core,
    communication: BRAND.core,
    community: BRAND.core,
  };
  return map[code] ?? BRAND.core;
}
