/**
 * Card displaying a risk flag with severity-colored left border.
 * Severity levels: critical (red), high (orange), medium (yellow), healthy (green).
 */

import { Card } from '../../../components/ui/card';

interface RiskFlagCardProps {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'healthy';
  dimension: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  healthy: 'Healthy',
};

export function RiskFlagCard({ title, description, severity, dimension }: RiskFlagCardProps): React.ReactNode {
  return (
    <Card
      severity={severity}
      data-testid="risk-flag-card"
      role="article"
      aria-label={`${severity} risk: ${title}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-[var(--text-secondary)]">{dimension}</span>
        <span className="text-xs font-semibold uppercase">{SEVERITY_LABELS[severity]}</span>
      </div>
      <h3 className="mb-2 text-base font-semibold text-[var(--grey-900)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
    </Card>
  );
}
