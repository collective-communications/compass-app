import { useMemo, useState, type ReactElement } from 'react';
import { Shield } from 'lucide-react';
import { AdminActionsTab } from '../components/admin-actions-tab';
import { AnalyticsDateRangeControl } from '../components/analytics-date-range';
import { AnalyticsSummaryRow, AnalyticsSummarySkeleton } from '../components/analytics-summary-row';
import {
  AnalyticsTabs,
  type AnalyticsDashboardTab,
} from '../components/analytics-tabs';
import { AnalyticsCard } from '../components/analytics-primitives';
import { NavigationTab } from '../components/navigation-tab';
import { OrganizationsTab } from '../components/organizations-tab';
import { OverviewTab } from '../components/overview-tab';
import { ReportsTab } from '../components/reports-tab';
import { SurveyFlowTab } from '../components/survey-flow-tab';
import { getPresetDateRange, isValidDateRange } from '../lib/date-range';
import { isAnalyticsSummaryEmpty } from '../lib/metrics';
import { useAnalyticsSummary } from '../hooks/use-analytics-summary';

function TabSkeleton(): ReactElement {
  return (
    <div className="space-y-4" aria-label="Loading analytics details">
      <div className="h-56 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-44 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
        <div className="h-44 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
      </div>
    </div>
  );
}

function EmptyState(): ReactElement {
  return (
    <AnalyticsCard className="py-14 text-center">
      <p className="text-sm font-semibold text-[var(--grey-900)]">
        No aggregate analytics recorded for this date range.
      </p>
    </AnalyticsCard>
  );
}

function ErrorState(): ReactElement {
  return (
    <AnalyticsCard>
      <p role="status" className="text-sm text-[var(--text-secondary)]">
        Usage analytics unavailable.
      </p>
    </AnalyticsCard>
  );
}

export function AnalyticsDashboardPage(): ReactElement {
  const [range, setRange] = useState(() => getPresetDateRange('30'));
  const [activeTab, setActiveTab] = useState<AnalyticsDashboardTab>('overview');
  const invalid = !isValidDateRange(range.startDate, range.endDate);
  const query = useAnalyticsSummary({
    startDate: range.startDate,
    endDate: range.endDate,
    enabled: !invalid,
  });

  const content = useMemo(() => {
    if (invalid) {
      return (
        <AnalyticsCard>
          <p className="text-sm text-[var(--feedback-error-text)]">
            Start date must be on or before end date.
          </p>
        </AnalyticsCard>
      );
    }

    if (query.isLoading) return <TabSkeleton />;
    if (query.error || !query.data) return <ErrorState />;
    if (isAnalyticsSummaryEmpty(query.data)) return <EmptyState />;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab summary={query.data} />;
      case 'navigation':
        return <NavigationTab summary={query.data} />;
      case 'survey':
        return <SurveyFlowTab summary={query.data} />;
      case 'admin':
        return <AdminActionsTab summary={query.data} />;
      case 'reports':
        return <ReportsTab summary={query.data} />;
      case 'organizations':
        return <OrganizationsTab summary={query.data} />;
    }
  }, [activeTab, invalid, query.data, query.error, query.isLoading]);

  return (
    <div className="mx-auto max-w-[var(--layout-max-wide)] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            CC+C internal / analytics
          </p>
          <h1 className="text-3xl font-semibold text-[var(--grey-900)]">Analytics</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Shield size={14} aria-hidden="true" />
            Aggregate usage, no visitor tracking
          </p>
        </div>

        <AnalyticsDateRangeControl value={range} invalid={invalid} onChange={setRange} />
      </div>

      {query.data && !invalid ? (
        <AnalyticsSummaryRow summary={query.data} />
      ) : (
        <AnalyticsSummarySkeleton />
      )}

      <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {content}
    </div>
  );
}
