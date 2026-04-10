/**
 * Compact horizontal chips showing dimension score deltas vs. organization average.
 * Replaces the full SegmentComparisonCard in the selected-segment layout.
 *
 * Each chip is color-tinted by delta direction:
 *   - Positive → neutral stone background, green text
 *   - Negative → pink background, red text
 */

import type { ReactElement } from 'react';
import type { DimensionDelta } from './lib/compute-deltas';

interface DimensionDeltaChipsProps {
  deltas: DimensionDelta[];
  className?: string;
}

function chipClasses(delta: number): string {
  if (delta >= 0) {
    return 'bg-[var(--delta-positive-bg)] text-[var(--delta-positive-text)]';
  }
  return 'bg-[var(--delta-negative-bg)] text-[var(--delta-negative-text)]';
}

function formatChipText(label: string, delta: number): string {
  const rounded = Math.round(delta);
  const sign = rounded >= 0 ? '+' : '';
  const direction = rounded >= 0 ? 'above' : 'below';
  return `${label}: ${sign}${rounded}% ${direction} avg`;
}

export function DimensionDeltaChips({
  deltas,
  className,
}: DimensionDeltaChipsProps): ReactElement {
  return (
    <div className={className}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        VS. ORGANIZATION AVERAGE
      </h4>
      <div className="flex flex-wrap gap-2">
        {deltas.map((d) => (
          <span
            key={d.dimensionCode}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${chipClasses(d.delta)}`}
          >
            {formatChipText(d.label, d.delta)}
          </span>
        ))}
      </div>
    </div>
  );
}
