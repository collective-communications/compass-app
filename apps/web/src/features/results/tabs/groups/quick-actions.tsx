/**
 * Quick action buttons for segment analysis.
 * Provides contextual navigation: compare segments, switch types, export.
 */

import type { ReactElement } from 'react';
import type { SegmentType } from '@compass/scoring';

const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  department: 'Department',
  role: 'Role',
  location: 'Location',
  tenure: 'Tenure',
};

const SEGMENT_TYPE_CYCLE: SegmentType[] = ['department', 'role', 'location', 'tenure'];

interface QuickActionsProps {
  segmentValue: string;
  segmentType: SegmentType;
  segmentValues: string[];
  onCompare: (value: string) => void;
  onViewByType: (type: SegmentType) => void;
  onExportReport: () => void;
}

/**
 * Returns the next segment value alphabetically after the current one.
 * Wraps around to the first value if current is last. Skips the current value.
 */
function getNextSegmentValue(current: string, values: string[]): string {
  const sorted = [...values].sort();
  const currentIndex = sorted.indexOf(current);
  if (currentIndex === -1) return sorted[0] ?? current;
  const nextIndex = (currentIndex + 1) % sorted.length;
  return sorted[nextIndex] ?? current;
}

/** Returns the next segment type in the cycle after the current one, wrapping around. */
function getNextSegmentType(current: SegmentType): SegmentType {
  const currentIndex = SEGMENT_TYPE_CYCLE.indexOf(current);
  const nextIndex = (currentIndex + 1) % SEGMENT_TYPE_CYCLE.length;
  return SEGMENT_TYPE_CYCLE[nextIndex] ?? current;
}

const BUTTON_CLASS =
  'rounded-lg bg-[var(--surface-subtle)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--grey-100)] transition-colors';

export function QuickActions({
  segmentValue,
  segmentType,
  segmentValues,
  onCompare,
  onViewByType,
  onExportReport,
}: QuickActionsProps): ReactElement {
  const compareTarget = getNextSegmentValue(segmentValue, segmentValues);
  const nextType = getNextSegmentType(segmentType);
  const showCompare = segmentValues.length > 1;

  return (
    <div className="flex flex-wrap gap-3">
      {showCompare && (
        <button
          type="button"
          className={BUTTON_CLASS}
          onClick={() => onCompare(compareTarget)}
        >
          {`Compare to ${compareTarget} \u2192`}
        </button>
      )}

      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onViewByType(nextType)}
      >
        {`View by ${SEGMENT_TYPE_LABELS[nextType].toLowerCase()} \u2192`}
      </button>

      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onExportReport()}
      >
        {'Export report \u2192'}
      </button>
    </div>
  );
}
