/**
 * SeverityFilter — horizontal pill bar for filtering
 * recommendations by severity level.
 */

import type { ReactElement } from 'react';
import type { RiskSeverity } from '@compass/scoring';
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '../../lib/severity-mapping';

type FilterValue = RiskSeverity | 'all';

interface SeverityFilterProps {
  activeFilter: FilterValue;
  counts: Record<RiskSeverity, number>;
  totalCount: number;
  onFilterChange: (filter: FilterValue) => void;
}

/** Horizontal severity pill filter with colored dots and count badges. */
export function SeverityFilter({
  activeFilter,
  counts,
  totalCount,
  onFilterChange,
}: SeverityFilterProps): ReactElement {
  return (
    <nav className="overflow-x-auto scrollbar-hide" aria-label="Filter by severity">
      <ul className="flex items-center gap-1">
        {/* All pill */}
        <li>
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeFilter === 'all'
                ? 'bg-[var(--grey-700)] text-white'
                : 'text-[var(--grey-500)] hover:bg-[var(--grey-50)]'
            }`}
            aria-current={activeFilter === 'all' ? 'true' : undefined}
            aria-label={`All recommendations (${totalCount})`}
          >
            All ({totalCount})
          </button>
        </li>

        {SEVERITY_ORDER.map((level) => {
          const count = counts[level] ?? 0;
          const isActive = activeFilter === level;
          return (
            <li key={level}>
              <button
                type="button"
                onClick={() => onFilterChange(level)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--grey-700)] text-white'
                    : 'text-[var(--grey-500)] hover:bg-[var(--grey-50)]'
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`${SEVERITY_LABELS[level]} (${count})`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[level] }}
                  aria-hidden="true"
                />
                {SEVERITY_LABELS[level]} ({count})
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type { FilterValue };
