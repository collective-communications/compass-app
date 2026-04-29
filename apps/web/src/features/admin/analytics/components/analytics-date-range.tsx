import type { ReactElement } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  ANALYTICS_RANGE_PRESETS,
  getPresetDateRange,
  type AnalyticsDateRange,
  type AnalyticsRangePreset,
} from '../lib/date-range';

export interface AnalyticsDateRangeControlProps {
  value: AnalyticsDateRange;
  invalid: boolean;
  onChange: (value: AnalyticsDateRange) => void;
}

export function AnalyticsDateRangeControl({
  value,
  invalid,
  onChange,
}: AnalyticsDateRangeControlProps): ReactElement {
  const handlePresetChange = (preset: AnalyticsRangePreset): void => {
    if (preset === 'custom') {
      onChange({ ...value, preset });
      return;
    }

    onChange(getPresetDateRange(preset));
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-1">
          {ANALYTICS_RANGE_PRESETS.map((preset) => {
            const active = value.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--color-core)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--grey-50)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-lg border bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-secondary)] ${
            invalid ? 'border-[var(--feedback-error-border)]' : 'border-[var(--grey-100)]'
          }`}
        >
          <CalendarDays size={14} aria-hidden="true" />
          <input
            aria-label="Analytics start date"
            type="date"
            value={value.startDate}
            onChange={(event) => {
              onChange({ ...value, startDate: event.target.value, preset: 'custom' });
            }}
            className="bg-transparent text-xs tabular-nums text-[var(--grey-900)] outline-none"
          />
          <span className="text-[var(--grey-300)]">to</span>
          <input
            aria-label="Analytics end date"
            type="date"
            value={value.endDate}
            onChange={(event) => {
              onChange({ ...value, endDate: event.target.value, preset: 'custom' });
            }}
            className="bg-transparent text-xs tabular-nums text-[var(--grey-900)] outline-none"
          />
        </div>
      </div>

      {invalid && (
        <p className="text-xs text-[var(--feedback-error-text)]" role="alert">
          Start date must be on or before end date.
        </p>
      )}
    </div>
  );
}
