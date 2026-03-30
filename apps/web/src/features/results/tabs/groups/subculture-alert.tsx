/**
 * Red left-bordered alert card shown when a segment deviates significantly
 * from the organization average on one or more dimensions.
 *
 * Only renders when deviating dimensions are present — returns null otherwise.
 */

import type { ReactElement } from 'react';
import type { DimensionDelta } from './lib/compute-deltas';

interface SubcultureAlertProps {
  segmentLabel: string;
  deviatingDimensions: DimensionDelta[];
}

function buildDescription(
  segmentLabel: string,
  dims: DimensionDelta[],
): string {
  if (dims.length === 1 && dims[0]) {
    return `${segmentLabel} shows significantly lower ${dims[0].label} scores than the organization average.`;
  }
  const names = dims.map((d) => d.label).join(', ');
  return `${segmentLabel} shows significantly different scores in ${names} compared to the organization average.`;
}

export function SubcultureAlert({
  segmentLabel,
  deviatingDimensions,
}: SubcultureAlertProps): ReactElement | null {
  if (deviatingDimensions.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border-l-4 border-l-[#B71C1C] bg-[#FFF5F0] p-6"
    >
      <p className="text-xs font-semibold uppercase text-[#B71C1C]">
        SUBCULTURE ALERT
      </p>
      <p className="mt-2 text-sm text-[var(--grey-700)]">
        {buildDescription(segmentLabel, deviatingDimensions)}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        This may indicate process barriers, tool fragmentation, or
        organizational silos that need attention.
      </p>
    </div>
  );
}
