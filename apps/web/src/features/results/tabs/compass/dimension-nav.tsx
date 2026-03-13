/**
 * Dimension navigation — sidebar on desktop, horizontal chip strip on mobile.
 * Items: Overview, Core, Clarity, Connection, Collaboration.
 */

import type { ReactElement } from 'react';
import type { DimensionScoreMap, RiskFlag } from '@compass/scoring';
import { dimensions, greyscale } from '@compass/tokens';
import { DimensionNavItem, type DimensionNavId } from './dimension-nav-item';

interface DimensionNavProps {
  scores: DimensionScoreMap;
  riskFlags: RiskFlag[];
  activeDimension: DimensionNavId;
  onSelect: (id: DimensionNavId) => void;
}

/** Brand colors per dimension. */
const DIMENSION_COLORS: Record<DimensionNavId, string> = {
  overview: greyscale[700],
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

const DIMENSION_LABELS: Record<DimensionNavId, string> = {
  overview: 'Overview',
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const NAV_ORDER: DimensionNavId[] = ['overview', 'core', 'clarity', 'connection', 'collaboration'];

function getOverviewScore(scores: DimensionScoreMap): number {
  const dims = Object.values(scores);
  if (dims.length === 0) return 0;
  return dims.reduce((sum, d) => sum + d.score, 0) / dims.length;
}

function getSeverityForDimension(riskFlags: RiskFlag[], dim: DimensionNavId): RiskFlag['severity'] | undefined {
  if (dim === 'overview') return undefined;
  const flag = riskFlags.find((f) => f.dimensionCode === dim);
  return flag?.severity;
}

export function DimensionNav({
  scores,
  riskFlags,
  activeDimension,
  onSelect,
}: DimensionNavProps): ReactElement {
  const getScore = (id: DimensionNavId): number => {
    if (id === 'overview') return getOverviewScore(scores);
    return scores[id]?.score ?? 0;
  };

  return (
    <>
      {/* Mobile: horizontal chip strip */}
      <nav
        aria-label="Dimension navigation"
        className="flex gap-2 overflow-x-auto pb-2 lg:hidden"
      >
        {NAV_ORDER.map((id) => {
          const isActive = activeDimension === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                  : 'bg-[var(--grey-50)] text-[var(--text-secondary)] hover:bg-[var(--grey-100)]'
              }`}
              aria-current={isActive ? 'true' : undefined}
            >
              {DIMENSION_LABELS[id]}
            </button>
          );
        })}
      </nav>

      {/* Desktop: vertical sidebar */}
      <nav
        aria-label="Dimension navigation"
        className="hidden w-[200px] shrink-0 flex-col gap-1 lg:flex"
      >
        {NAV_ORDER.map((id) => (
          <DimensionNavItem
            key={id}
            id={id}
            label={DIMENSION_LABELS[id]}
            score={getScore(id)}
            color={DIMENSION_COLORS[id]}
            isActive={activeDimension === id}
            severity={getSeverityForDimension(riskFlags, id)}
            onClick={onSelect}
          />
        ))}
      </nav>
    </>
  );
}
