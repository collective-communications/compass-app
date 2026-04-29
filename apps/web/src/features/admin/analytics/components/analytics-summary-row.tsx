import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Building2, Check, FileDown, Play, Route } from 'lucide-react';
import type { AnalyticsSummary } from '@compass/types';

interface SummaryMetric {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}

function buildSummaryMetrics(summary: AnalyticsSummary): SummaryMetric[] {
  return [
    {
      key: 'events',
      label: 'Events',
      value: summary.totalEvents,
      icon: Activity,
      accent: 'var(--color-navy-teal)',
    },
    {
      key: 'route-views',
      label: 'Route views',
      value: summary.routeViews,
      icon: Route,
      accent: 'var(--color-interactive)',
    },
    {
      key: 'starts',
      label: 'Starts',
      value: summary.surveyStarts,
      icon: Play,
      accent: 'var(--color-clarity)',
    },
    {
      key: 'completions',
      label: 'Completions',
      value: summary.surveyCompletions,
      icon: Check,
      accent: 'var(--severity-healthy-text)',
    },
    {
      key: 'reports',
      label: 'Reports',
      value: summary.reportGenerations + summary.reportDownloads,
      icon: FileDown,
      accent: 'var(--color-rose)',
    },
    {
      key: 'active-orgs',
      label: 'Active orgs',
      value: summary.activeOrganizations,
      icon: Building2,
      accent: 'var(--color-core)',
    },
  ];
}

export interface AnalyticsSummaryRowProps {
  summary: AnalyticsSummary;
}

export function AnalyticsSummaryRow({ summary }: AnalyticsSummaryRowProps): ReactElement {
  return (
    <section
      aria-label="Analytics summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {buildSummaryMetrics(summary).map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.key}
            className="min-w-0 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-2 text-[var(--text-tertiary)]">
              <Icon size={15} aria-hidden="true" style={{ color: metric.accent }} />
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em]">
                {metric.label}
              </span>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-[var(--grey-900)]">
              {metric.value.toLocaleString()}
            </p>
          </div>
        );
      })}
    </section>
  );
}

export function AnalyticsSummarySkeleton(): ReactElement {
  return (
    <section
      aria-label="Loading analytics summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {['events', 'routes', 'starts', 'completions', 'reports', 'orgs'].map((key) => (
        <div
          key={key}
          className="h-24 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
        />
      ))}
    </section>
  );
}
