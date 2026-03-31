/**
 * Header showing the selected segment name, response count, and analysis type.
 * Displayed when a specific above-threshold segment is selected.
 */

import type { ReactElement } from 'react';
import type { SegmentType } from '@compass/scoring';

/** Capitalize segment type for display: "department" → "Department" */
const SEGMENT_TYPE_DISPLAY: Record<SegmentType, string> = {
  department: 'Department',
  role: 'Role',
  location: 'Location',
  tenure: 'Tenure',
};

interface SegmentHeaderProps {
  /** The selected segment value, e.g. "Engineering" */
  segmentValue: string;
  /** The segment type, e.g. "department" */
  segmentType: SegmentType;
  /** Number of respondents in this segment */
  responseCount: number;
}

export function SegmentHeader({
  segmentValue,
  segmentType,
  responseCount,
}: SegmentHeaderProps): ReactElement {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
        {segmentValue} {SEGMENT_TYPE_DISPLAY[segmentType]}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {responseCount} response{responseCount !== 1 ? 's' : ''} · Subculture analysis
      </p>
    </div>
  );
}
