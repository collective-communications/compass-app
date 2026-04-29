import type { ReactElement } from 'react';
import { AnalyticsEventName } from '@compass/types';
import {
  AnalyticsCard,
  BarList,
  SectionHeader,
  StackedBar,
} from './analytics-primitives';
import { getEventLabel } from '../lib/labels';
import {
  ADMIN_WORKFLOW_EVENTS,
  getActionStatusCounts,
  getEventCount,
  getStatusSegments,
  getTotalStatusCount,
} from '../lib/metrics';
import type { AnalyticsTabProps } from './overview-tab';

export function AdminActionsTab({ summary }: AnalyticsTabProps): ReactElement {
  const workflowItems = ADMIN_WORKFLOW_EVENTS.map((eventName) => ({
    key: eventName,
    label: getEventLabel(eventName),
    value: getEventCount(summary, eventName),
    description: eventName,
  }));

  const actionEvents = [
    AnalyticsEventName.SURVEY_CONFIG_SAVED,
    AnalyticsEventName.SURVEY_PUBLISHED,
    AnalyticsEventName.SURVEY_UNPUBLISHED,
    AnalyticsEventName.SURVEY_LINK_COPIED,
    AnalyticsEventName.REPORT_GENERATION_REQUESTED,
    AnalyticsEventName.REPORT_DOWNLOAD_REQUESTED,
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AnalyticsCard>
          <SectionHeader eyebrow="Workflow counts" title="CC+C operational activity" />
          <BarList
            items={workflowItems}
            emptyLabel="No admin workflow events recorded for this date range."
          />
        </AnalyticsCard>

        <AnalyticsCard>
          <SectionHeader
            eyebrow="Action outcomes"
            title="Status by action"
            hint="Requested, succeeded, failed, canceled"
          />
          <div className="space-y-4">
            {actionEvents.map((eventName) => {
              const counts = getActionStatusCounts(summary, eventName);
              const segments = getStatusSegments(counts);
              const total = getTotalStatusCount(counts);
              return (
                <div key={eventName}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--grey-900)]">
                      {getEventLabel(eventName)}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
                      {total.toLocaleString()} events
                    </span>
                  </div>
                  <StackedBar segments={segments} />
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                    {segments.map((segment) => (
                      <span key={segment.key} className="inline-flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-sm"
                          style={{ background: segment.color }}
                        />
                        {segment.label}
                        <span className="font-semibold tabular-nums text-[var(--grey-900)]">
                          {segment.value.toLocaleString()}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
      </div>

      <AnalyticsCard>
        <SectionHeader
          eyebrow="Activity by organization"
          title="Where operational work landed"
          hint={`Threshold: >= ${summary.minimumReportableCount} events`}
        />
        <div className="space-y-1">
          {summary.topOrganizations.slice(0, 8).map((organization, index) => (
            <div
              key={organization.organizationId}
              className="grid grid-cols-[2rem_minmax(0,1fr)_6rem] items-center gap-3 border-b border-[var(--grey-100)] py-2 last:border-b-0"
            >
              <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <span className="truncate text-sm font-medium text-[var(--grey-900)]">
                {organization.organizationName}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-[var(--grey-900)]">
                {organization.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {summary.topOrganizations.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            No organizations met the reporting threshold for this date range.
          </p>
        )}
      </AnalyticsCard>
    </div>
  );
}
