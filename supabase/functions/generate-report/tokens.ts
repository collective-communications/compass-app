/**
 * Brand tokens and display constants for the HTML report renderer.
 * Mirrored from @compass/tokens — edge functions can't import workspace packages.
 * Keep in sync with packages/tokens/src/index.ts.
 */

export const BRAND = {
  core: '#0C3D50',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
  white: '#FFFFFF',
  lightGrey: '#F5F5F5',
  midGrey: '#9E9E9E',
  darkGrey: '#424242',
  textPrimary: '#212121',
  textSecondary: '#616161',
  border: '#E5E4E0',
};

export const DIMENSION_LABELS: Record<string, string> = {
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
  culture: 'Culture',
  communication: 'Communication',
  community: 'Community',
};

/**
 * Severity colors — mirrored from @compass/tokens.
 * Keep in sync with packages/tokens/src/index.ts.
 */
export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B71C1C',
  high: '#E65100',
  medium: '#F9A825',
  healthy: '#2E7D32',
  low: '#2E7D32',
};
