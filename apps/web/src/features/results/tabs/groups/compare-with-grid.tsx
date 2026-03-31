/**
 * Segment comparison grid -- quick-switch pills in the insights panel.
 * Allows comparing between segments without scrolling to the filter bar.
 */

import type { ReactElement } from 'react';
import { Lock } from 'lucide-react';

interface CompareWithGridProps {
  segmentValues: string[];
  currentValue: string;
  belowThresholdValues: Set<string>;
  onSelect: (value: string) => void;
}

export function CompareWithGrid({
  segmentValues,
  currentValue,
  belowThresholdValues,
  onSelect,
}: CompareWithGridProps): ReactElement {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Compare With
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {segmentValues.map((value) => {
          const isActive = currentValue === value;
          const isBelowThreshold = belowThresholdValues.has(value);

          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isBelowThreshold
                  ? `${value} — Below anonymity threshold`
                  : value
              }
              onClick={() => onSelect(value)}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs text-center transition-colors ${
                isActive
                  ? 'bg-[#0A3B4F] text-white font-medium'
                  : 'bg-[#F0EEEB] text-[var(--text-secondary)] hover:bg-[var(--grey-200)]'
              }`}
            >
              {isBelowThreshold && (
                <Lock className="size-3 shrink-0" aria-hidden="true" />
              )}
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
