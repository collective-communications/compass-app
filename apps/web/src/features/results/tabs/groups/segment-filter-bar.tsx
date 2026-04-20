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
    <div className="flex flex-col gap-0">
      {/* Segment type dropdown bar */}
      <div className="flex items-center justify-between border-b border-[var(--grey-100)] bg-[var(--surface-subtle)] px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Filter by:
          </span>
          <div className="relative">
            <select
              value={segmentType}
              onChange={(e) => onTypeChange(e.target.value as SegmentType)}
              className="appearance-none rounded-md border border-[var(--grey-100)] bg-[var(--surface-card)] py-2 pl-3 pr-8 text-sm text-[var(--text-secondary)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)]"
              aria-label="Segment type"
            >
              {SEGMENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {SEGMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          Groups &lt;7 members combined for confidentiality
        </span>
      </div>

      {/* Segment value pills */}
      <div
        className="flex flex-wrap gap-2 px-6 py-3"
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
