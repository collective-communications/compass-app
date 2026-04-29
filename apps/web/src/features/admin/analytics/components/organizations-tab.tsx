import type { ReactElement } from 'react';
import { Shield } from 'lucide-react';
import { AnalyticsCard, AnalyticsPill, SectionHeader } from './analytics-primitives';
import type { AnalyticsTabProps } from './overview-tab';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function OrganizationsTab({ summary }: AnalyticsTabProps): ReactElement {
  const max = Math.max(1, ...summary.topOrganizations.map((organization) => organization.count));

  return (
    <AnalyticsCard padded={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <SectionHeader
          eyebrow="Organization activity"
          title="Reportable client organizations"
        />
        <AnalyticsPill tone="info">
          <Shield size={11} aria-hidden="true" />
          Threshold &gt;= {summary.minimumReportableCount} events
        </AnalyticsPill>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-[var(--grey-100)]">
              <th className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Organization
              </th>
              <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Events
              </th>
              <th className="min-w-56 px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Share of top organization
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.topOrganizations.map((organization) => (
              <tr key={organization.organizationId} className="border-b border-[var(--grey-100)]">
                <td className="px-5 py-3">
                  <span className="inline-flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--grey-100)] bg-[var(--grey-50)] text-xs font-semibold text-[var(--color-core)]">
                      {getInitials(organization.organizationName)}
                    </span>
                    <span className="truncate font-medium text-[var(--grey-900)]">
                      {organization.organizationName}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-[var(--grey-900)]">
                  {organization.count.toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--grey-50)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-core)]"
                      style={{ width: `${(organization.count / max) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.topOrganizations.length === 0 && (
          <p className="px-5 py-6 text-sm text-[var(--text-secondary)]">
            No organizations met the reporting threshold for this date range.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--grey-100)] px-5 py-3 text-xs text-[var(--text-tertiary)]">
        <Shield size={13} aria-hidden="true" />
        <span>
          Organizations appear after at least {summary.minimumReportableCount} aggregate events.
          Suppressed organizations are not shown.
        </span>
      </div>
    </AnalyticsCard>
  );
}
