/**
 * Severity level mapping — colors, ordering, and display labels
 * for recommendation severity indicators.
 */

import { severity, type SeverityLevel } from '@compass/tokens';

/** Re-export for backward compatibility. */
export type { SeverityLevel };

/** Left-border colors per severity level, derived from design tokens. */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: severity.critical.border,
  high: severity.high.border,
  medium: severity.medium.border,
  healthy: severity.healthy.border,
} as const;

/** Sort order for severity (most severe first). Excludes "healthy" — filter shows only actionable severities. */
export const SEVERITY_ORDER: SeverityLevel[] = [
  'critical',
  'high',
  'medium',
] as const;

/** Display labels for severity pills. */
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  healthy: 'Healthy',
} as const;

/**
 * Returns a numeric sort key for a severity level.
 * Lower numbers sort first (higher severity).
 */
export function severitySortKey(sev: SeverityLevel): number {
  const index = SEVERITY_ORDER.indexOf(sev);
  return index === -1 ? SEVERITY_ORDER.length : index;
}
