/**
 * Compact CC+C usage analytics panel for the clients surface.
 */
import type { ReactElement } from 'react';
import { Activity, BarChart3, FileDown, Route, Users } from 'lucide-react';
import type { AnalyticsSummary } from '@compass/types';
import { AppLink } from '../../../../components/navigation/app-link';
import { useAnalyticsSummary } from '../hooks/use-analytics-summary';

interface MetricProps {
  label: string;
  value: number;
  icon: ReactElement;
}

function Metric({ label, value, icon }: MetricProps): ReactElement {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[var(--text-tertiary)]">
        {icon}
        <span className="truncate text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-[var(--grey-900)]">{value}</p>
    </div>
  );
}

function TopRoute({ summary }: { summary: AnalyticsSummary }): ReactElement | null {
  const route = summary.routeViewsByRoute[0];
  if (!route) return null;

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[var(--text-tertiary)]">
        <Route size={15} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">Top Route</span>
      </div>
      <p className="truncate text-sm font-medium text-[var(--grey-900)]">{route.routeTemplate}</p>
      <p className="mt-1 text-xs tabular-nums text-[var(--text-secondary)]">{route.count} views</p>
    </div>
  );
}

export function AnalyticsSummaryPanel(): ReactElement {
  const { data: summary, isLoading, error } = useAnalyticsSummary();

  if (isLoading) {
    return (
      <section aria-label="Usage analytics" className="mb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section aria-label="Usage analytics" className="mb-6">
        <div
          role="status"
          className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          Usage analytics unavailable.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Usage analytics" className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Usage Analytics
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            {summary.startDate} to {summary.endDate}
          </span>
          <AppLink
            to="/analytics"
            className="text-xs font-semibold text-[var(--color-interactive)] hover:underline"
          >
            Open dashboard
          </AppLink>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Metric
          label="Events"
          value={summary.totalEvents}
          icon={<Activity size={15} aria-hidden="true" />}
        />
        <Metric
          label="Route Views"
          value={summary.routeViews}
          icon={<BarChart3 size={15} aria-hidden="true" />}
        />
        <Metric
          label="Survey Starts"
          value={summary.surveyStarts}
          icon={<Users size={15} aria-hidden="true" />}
        />
        <Metric
          label="Completions"
          value={summary.surveyCompletions}
          icon={<Users size={15} aria-hidden="true" />}
        />
        <Metric
          label="Reports"
          value={summary.reportGenerations + summary.reportDownloads}
          icon={<FileDown size={15} aria-hidden="true" />}
        />
        <TopRoute summary={summary} />
      </div>
    </section>
  );
}
