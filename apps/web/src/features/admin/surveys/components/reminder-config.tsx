/**
 * Reminder cadence configuration component.
 * Checkboxes for standard reminder intervals after invitation.
 */

import { useCallback, type ReactElement } from 'react';

export interface ReminderConfigProps {
  value: number[];
  onChange: (schedule: number[]) => void;
}

const REMINDER_OPTIONS = [
  { days: 3, label: '3 days after invitation' },
  { days: 7, label: '7 days after invitation' },
  { days: 14, label: '14 days after invitation' },
] as const;

export function ReminderConfig({ value, onChange }: ReminderConfigProps): ReactElement {
  const handleToggle = useCallback(
    (days: number) => {
      const next = value.includes(days)
        ? value.filter((d) => d !== days)
        : [...value, days].sort((a, b) => a - b);
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-[var(--grey-700)]">Reminder Schedule</p>
      <p className="text-xs text-[var(--grey-500)]">
        Automatic reminders sent to recipients who have not completed the survey
      </p>
      <div className="mt-1 flex flex-col gap-2">
        {REMINDER_OPTIONS.map((option) => (
          <label key={option.days} className="flex items-center gap-2 text-sm text-[var(--grey-700)]">
            <input
              type="checkbox"
              checked={value.includes(option.days)}
              onChange={() => handleToggle(option.days)}
              className="h-4 w-4 rounded border-[var(--grey-300)] text-[var(--grey-900)] focus:ring-[var(--grey-500)]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
