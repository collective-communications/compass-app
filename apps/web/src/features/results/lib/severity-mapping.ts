/**
 * Severity level mapping — colors, ordering, and display labels
 * for recommendation severity indicators.
 */

import type { RiskSeverity } from '@compass/scoring';

/** Severity display metadata. */
export type SeverityLevel = RiskSeverity;

/** Left-border colors per severity level. */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#B71C1C',
  high: '#E65100',
  medium: '#F9A825',
  healthy: '#2E7D32',
} as const;

/** Sort order for severity (most severe first). */
export const SEVERITY_ORDER: SeverityLevel[] = [
  'critical',
  'high',
  'medium',
  'healthy',
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
export function severitySortKey(severity: SeverityLevel): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}
