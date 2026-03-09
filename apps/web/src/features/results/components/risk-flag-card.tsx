/**
 * Card displaying a risk flag with severity-colored left border.
 * Severity levels: critical (red), high (orange), medium (yellow), healthy (green).
 */

interface RiskFlagCardProps {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'healthy';
  dimension: string;
}

const SEVERITY_BORDERS: Record<string, string> = {
  critical: 'border-l-[#B71C1C]',
  high: 'border-l-[#E65100]',
  medium: 'border-l-[#F9A825]',
  healthy: 'border-l-[#2E7D32]',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  healthy: 'Healthy',
};

export function RiskFlagCard({ title, description, severity, dimension }: RiskFlagCardProps): React.ReactNode {
  return (
    <div
      data-testid="risk-flag-card"
      className={`rounded-lg border border-[#E5E4E0] border-l-4 bg-white p-6 ${SEVERITY_BORDERS[severity]}`}
      role="article"
      aria-label={`${severity} risk: ${title}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-[#757575]">{dimension}</span>
        <span className="text-xs font-semibold uppercase">{SEVERITY_LABELS[severity]}</span>
      </div>
      <h3 className="mb-2 text-base font-semibold text-[#212121]">{title}</h3>
      <p className="text-sm text-[#616161]">{description}</p>
    </div>
  );
}
