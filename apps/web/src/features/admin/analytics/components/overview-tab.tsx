import type { ReactElement } from 'react';
import type { AnalyticsSummary } from '@compass/types';
import {
  AnalyticsCard,
  BarList,
  DailyActivityChart,
  SectionHeader,
} from './analytics-primitives';
import { getEventLabel, getSurfaceLabel } from '../lib/labels';
import { getNormalizedDailyTotals } from '../lib/metrics';

export interface AnalyticsTabProps {
  summary: AnalyticsSummary;
}

function formatDisplayDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OverviewTab({ summary }: AnalyticsTabProps): ReactElement {
  const dailyTotals = getNormalizedDailyTotals(summary);
  const peak = Math.max(0, ...dailyTotals.map((row) => row.count));
  const eventItems = summary.byEvent.slice(0, 8).map((row) => ({
    key: row.eventName,
    label: getEventLabel(row.eventName),
    value: row.count,
    description: row.eventName,
  }));
  const surfaceItems = summary.bySurface.map((row) => ({
    key: row.surface,
    label: getSurfaceLabel(row.surface),
    value: row.count,
  }));
  const topRoute = summary.routeViewsByRoute[0];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
      <AnalyticsCard>
        <SectionHeader
          eyebrow="Daily activity"
          title="Events per day"
          hint={`${dailyTotals.length} days`}
        />
        <DailyActivityChart data={dailyTotals} />
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--text-tertiary)]">
          <span>
            {formatDisplayDate(summary.startDate)} to {formatDisplayDate(summary.endDate)}
          </span>
          <span className="tabular-nums">Peak day: {peak.toLocaleString()} events</span>
        </div>
        <table className="sr-only">
          <caption>Daily aggregate analytics events</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Events</th>
            </tr>
          </thead>
          <tbody>
            {dailyTotals.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AnalyticsCard>

      <AnalyticsCard className="flex flex-col justify-between border-transparent bg-[var(--color-navy-teal)] text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
            Top route
          </p>
          <p className="mt-3 break-all font-mono text-sm text-[var(--color-mint)]">
            {topRoute?.routeTemplate ?? 'No route views'}
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums">
            {(topRoute?.count ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-white/65">
            views from route templates only
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/15 pt-4 sm:grid-cols-3 xl:grid-cols-1">
          {summary.routeViewsByRoute.slice(1, 4).map((route) => (
            <div key={route.routeTemplate} className="min-w-0">
              <p className="truncate font-mono text-[11px] text-white/60" title={route.routeTemplate}>
                {route.routeTemplate}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {route.count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      <AnalyticsCard>
        <SectionHeader
          eyebrow="Event mix"
          title="What kinds of events were captured"
          hint="Top 8"
        />
        <BarList items={eventItems} />
      </AnalyticsCard>

      <AnalyticsCard>
        <SectionHeader eyebrow="Surface mix" title="Activity by product surface" />
        <BarList
          items={surfaceItems}
          emptyLabel="No surface activity recorded for this date range."
        />
      </AnalyticsCard>
    </div>
  );
}
