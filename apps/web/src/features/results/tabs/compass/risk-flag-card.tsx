/**
 * Individual risk flag card with severity-colored left border.
 * Border colors: critical=#B71C1C, high=#E65100, medium=#F9A825, healthy=#2E7D32.
 */

import type { ReactElement } from 'react';
import type { RiskFlag } from '@compass/scoring';

interface RiskFlagCardProps {
  flag: RiskFlag;
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-[#B71C1C]',
  high: 'border-l-[#E65100]',
  medium: 'border-l-[#F9A825]',
  healthy: 'border-l-[#2E7D32]',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'text-[#B71C1C]',
  high: 'text-[#E65100]',
  medium: 'text-[#F9A825]',
  healthy: 'text-[#2E7D32]',
};

export function RiskFlagCard({ flag }: RiskFlagCardProps): ReactElement {
  const borderClass = SEVERITY_BORDER[flag.severity] ?? SEVERITY_BORDER.medium;
  const labelClass = SEVERITY_LABEL[flag.severity] ?? SEVERITY_LABEL.medium;

  return (
    <div
      className={`rounded-lg border border-[var(--grey-100)] border-l-4 bg-[var(--grey-50)] p-4 ${borderClass}`}
      role="listitem"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
            {flag.severity}
          </span>
          <span className="mx-2 text-[var(--grey-400)]">&middot;</span>
          <span className="text-sm font-medium text-[var(--grey-700)]">{flag.dimensionName}</span>
        </div>
        <span className="text-sm font-semibold text-[#616161]">{Math.round(flag.score)}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--grey-500)]">{flag.message}</p>
    </div>
  );
}
