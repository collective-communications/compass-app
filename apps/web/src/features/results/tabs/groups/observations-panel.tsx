/**
 * Observations panel -- derived insights about a segment's culture profile.
 * Displays up to 3 observations comparing segment scores to the organization average.
 */

import type { ReactElement } from 'react';
import type { SegmentObservation } from './lib/compute-deltas';

interface ObservationsPanelProps {
  observations: SegmentObservation[];
}

export function ObservationsPanel({ observations }: ObservationsPanelProps): ReactElement | null {
  if (observations.length === 0) return null;

  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Observations
      </h4>
      <div className="flex flex-col gap-2">
        {observations.map((obs) => (
          <div
            key={obs.dimensionCode}
            className="flex items-start gap-2.5 rounded-md bg-[#F0EEEB] p-3"
          >
            <span
              className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: obs.dotColor }}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{obs.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{obs.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
