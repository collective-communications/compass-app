/**
 * Segment filter bar: type dropdown + value pill bar.
 * Segment type and value are persisted to URL search params.
 */

import type { ReactElement } from 'react';
import { Lock } from 'lucide-react';
import type { SegmentType } from '@compass/scoring';

/** Segment type labels for the dropdown. */
const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  department: 'Department',
  role: 'Role',
  location: 'Location',
  tenure: 'Tenure',
};

const SEGMENT_TYPE_OPTIONS: SegmentType[] = ['department', 'role', 'location', 'tenure'];

/** "All" is a sentinel meaning no specific segment is selected. */
const ALL_VALUE = 'all';

interface SegmentFilterBarProps {
  segmentType: SegmentType;
  segmentValue: string;
  segmentValues: string[];
  belowThresholdValues: Set<string>;
  onTypeChange: (type: SegmentType) => void;
  onValueChange: (value: string) => void;
}

export function SegmentFilterBar({
  segmentType,
  segmentValue,
  segmentValues,
  belowThresholdValues,
  onTypeChange,
  onValueChange,
}: SegmentFilterBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {/* Segment type pills */}
      <nav
        className="flex gap-1"
        role="radiogroup"
        aria-label="Segment type"
      >
        {SEGMENT_TYPE_OPTIONS.map((type) => {
          const isActive = segmentType === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onTypeChange(type)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--grey-100)]'
              }`}
            >
              {SEGMENT_TYPE_LABELS[type]}
            </button>
          );
        })}
      </nav>

      {/* Segment value pills */}
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={`${SEGMENT_TYPE_LABELS[segmentType]} segment values`}
      >
        {/* "All" pill */}
        <button
          type="button"
          role="radio"
          aria-checked={segmentValue === ALL_VALUE}
          onClick={() => onValueChange(ALL_VALUE)}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            segmentValue === ALL_VALUE
              ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
              : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
          }`}
        >
          All
        </button>

        {segmentValues.map((value) => {
          const isActive = segmentValue === value;
          const isBelowThreshold = belowThresholdValues.has(value);

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={
                isBelowThreshold
                  ? `${value} — Below anonymity threshold`
                  : value
              }
              onClick={() => onValueChange(value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                  : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
              }`}
            >
              {isBelowThreshold && (
                <Lock className="size-3" aria-hidden="true" />
              )}
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
