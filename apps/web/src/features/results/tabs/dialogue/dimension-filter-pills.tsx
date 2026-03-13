/**
 * Dimension filter pills — horizontal scrollable pill bar.
 * [All, Core, Clarity, Connection, Collaboration]
 */

import type { ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';

/** Filter value: null represents "All". */
export type DimensionFilter = DimensionCode | null;

interface DimensionFilterPillsProps {
  active: DimensionFilter;
  onChange: (filter: DimensionFilter) => void;
}

interface PillOption {
  value: DimensionFilter;
  label: string;
}

const OPTIONS: PillOption[] = [
  { value: null, label: 'All' },
  { value: 'core', label: 'Core' },
  { value: 'clarity', label: 'Clarity' },
  { value: 'connection', label: 'Connection' },
  { value: 'collaboration', label: 'Collaboration' },
];

/** Dimension filter pills for dialogue responses. */
export function DimensionFilterPills({
  active,
  onChange,
}: DimensionFilterPillsProps): ReactElement {
  return (
    <nav className="overflow-x-auto scrollbar-hide" aria-label="Dimension filter">
      <ul className="flex items-center gap-1">
        {OPTIONS.map((option) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                active === option.value
                  ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                  : 'text-[var(--grey-500)] hover:bg-[var(--grey-50)]'
              }`}
              aria-current={active === option.value ? 'true' : undefined}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
