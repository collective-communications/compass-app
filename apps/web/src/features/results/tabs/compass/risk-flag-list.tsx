/**
 * Sorted list of risk flags, ordered critical → high → medium.
 * When no flags exist, displays a healthy-state card.
 */

import type { ReactElement } from 'react';
import type { RiskFlag } from '@compass/scoring';
import { RiskFlagCard } from './risk-flag-card';

interface RiskFlagListProps {
  flags: RiskFlag[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  healthy: 3,
};

function sortFlags(flags: RiskFlag[]): RiskFlag[] {
  return [...flags].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );
}

export function RiskFlagList({ flags }: RiskFlagListProps): ReactElement {
  /** Filter out healthy flags — they're not risk flags. */
  const riskFlags = flags.filter((f) => f.severity !== 'healthy');

  if (riskFlags.length === 0) {
    return (
      <div
        className="rounded-lg border border-[var(--grey-100)] border-l-4 border-l-[#2E7D32] bg-[var(--grey-50)] p-6"
        role="status"
      >
        <p className="text-sm font-medium text-[#2E7D32]">
          All dimensions within healthy range.
        </p>
      </div>
    );
  }

  const sorted = sortFlags(riskFlags);

  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Risk flags">
      {sorted.map((flag) => (
        <RiskFlagCard key={flag.dimensionCode} flag={flag} />
      ))}
    </div>
  );
}
