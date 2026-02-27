/**
 * CSS-only bar chart showing daily survey completion counts.
 * No charting library — proportional bars via inline width styles.
 */

import type { ReactElement } from 'react';
import type { DailyCompletion } from '../services/deployment-service';

export interface CompletionChartProps {
  dailyCompletions: DailyCompletion[];
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CompletionChart({ dailyCompletions }: CompletionChartProps): ReactElement {
  if (dailyCompletions.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
        <h3 className="text-sm font-semibold text-[var(--grey-900)]">Daily Completions</h3>
        <p className="mt-4 text-sm text-[var(--grey-500)]">No completions yet</p>
      </div>
    );
  }

  const maxCount = Math.max(...dailyCompletions.map((d) => d.count), 1);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <h3 className="text-sm font-semibold text-[var(--grey-900)]">Daily Completions</h3>

      <div className="mt-4 flex flex-col gap-2">
        {dailyCompletions.map((day) => (
          <div key={day.date} className="flex items-center gap-3">
            {/* Date label */}
            <span className="w-16 shrink-0 text-right text-xs text-[var(--grey-500)]">
              {formatShortDate(day.date)}
            </span>

            {/* Bar */}
            <div className="flex-1">
              <div className="h-5 overflow-hidden rounded bg-[var(--grey-100)]">
                <div
                  className="h-full rounded bg-[var(--grey-700)] transition-all duration-300"
                  style={{ width: `${(day.count / maxCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Count */}
            <span className="w-8 text-right text-xs font-medium text-[var(--grey-900)]">
              {day.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
