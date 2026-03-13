/**
 * Individual dimension navigation item with a score ring, name, and optional risk dot.
 * Used in the sidebar (desktop) dimension nav.
 */

import type { ReactElement } from 'react';
import type { RiskSeverity } from '@compass/scoring';
import { ScoreRing } from './score-ring';

export type DimensionNavId = 'overview' | 'core' | 'clarity' | 'connection' | 'collaboration';

interface DimensionNavItemProps {
  id: DimensionNavId;
  label: string;
  score: number;
  color: string;
  isActive: boolean;
  severity?: RiskSeverity;
  onClick: (id: DimensionNavId) => void;
}

const RISK_DOT_COLOR: Record<string, string> = {
  critical: 'bg-[var(--severity-critical-text)]',
  high: 'bg-[var(--severity-high-text)]',
  medium: 'bg-[var(--severity-medium-text)]',
};

export function DimensionNavItem({
  id,
  label,
  score,
  color,
  isActive,
  severity,
  onClick,
}: DimensionNavItemProps): ReactElement {
  const showDot = severity && severity !== 'healthy' && RISK_DOT_COLOR[severity];

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isActive
          ? 'border-l-[3px] border-l-[var(--grey-700)] bg-[var(--grey-50)]'
          : 'hover:bg-[var(--grey-50)]'
      }`}
      aria-current={isActive ? 'true' : undefined}
    >
      <ScoreRing score={score} color={color} size={36} strokeWidth={3} showLabel={false} />
      <div className="flex flex-1 items-center gap-2">
        <span className="text-sm font-medium text-[var(--grey-700)]">{label}</span>
        {showDot && (
          <span
            className={`h-2 w-2 rounded-full ${RISK_DOT_COLOR[severity]}`}
            aria-label={`${severity} risk`}
          />
        )}
      </div>
      <span className="text-sm font-semibold text-[var(--text-secondary)]">{Math.round(score)}</span>
    </button>
  );
}
