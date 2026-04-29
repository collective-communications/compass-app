import {
  AnalyticsActionStatus,
  AnalyticsEventName,
  AnalyticsSurface,
  type AnalyticsActionStatus as AnalyticsActionStatusType,
  type AnalyticsEventName as AnalyticsEventNameType,
  type AnalyticsSummary,
} from '@compass/types';
import { getInclusiveDates } from './date-range';

export interface AnalyticsBarItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  description?: string;
}

export interface AnalyticsStatusCounts {
  requested: number;
  succeeded: number;
  failed: number;
  canceled: number;
}

export const ADMIN_WORKFLOW_EVENTS: readonly AnalyticsEventNameType[] = [
  AnalyticsEventName.ADMIN_CLIENT_SELECTED,
  AnalyticsEventName.SURVEY_CREATED,
  AnalyticsEventName.SURVEY_CONFIG_SAVED,
  AnalyticsEventName.SURVEY_PUBLISHED,
  AnalyticsEventName.SURVEY_UNPUBLISHED,
  AnalyticsEventName.SURVEY_LINK_COPIED,
];

export const REPORT_EVENTS: readonly AnalyticsEventNameType[] = [
  AnalyticsEventName.RESULTS_TAB_VIEWED,
  AnalyticsEventName.REPORT_GENERATION_REQUESTED,
  AnalyticsEventName.REPORT_DOWNLOAD_REQUESTED,
];

export function getEventCount(
  summary: AnalyticsSummary,
  eventName: AnalyticsEventNameType,
): number {
  return summary.byEvent.find((row) => row.eventName === eventName)?.count ?? 0;
}

export function getActionStatusCounts(
  summary: AnalyticsSummary,
  eventName: AnalyticsEventNameType,
): AnalyticsStatusCounts {
  const counts: AnalyticsStatusCounts = {
    requested: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };

  for (const row of summary.actionStatuses) {
    if (row.eventName !== eventName) continue;
    counts[row.actionStatus] = row.count;
  }

  return counts;
}

export function getTotalStatusCount(counts: AnalyticsStatusCounts): number {
  return counts.requested + counts.succeeded + counts.failed + counts.canceled;
}

export function isAnalyticsSummaryEmpty(summary: AnalyticsSummary): boolean {
  return summary.totalEvents === 0
    && summary.byEvent.length === 0
    && summary.dailyTotals.length === 0;
}

export function getNormalizedDailyTotals(
  summary: AnalyticsSummary,
): Array<{ date: string; count: number }> {
  const counts = new Map(summary.dailyTotals.map((row) => [row.date, row.count]));
  const dates = getInclusiveDates(summary.startDate, summary.endDate);
  if (dates.length === 0) return summary.dailyTotals;
  return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export function getAudienceSplit(summary: AnalyticsSummary): {
  admin: number;
  respondent: number;
  other: number;
} {
  let admin = 0;
  let respondent = 0;
  let other = 0;

  for (const row of summary.bySurface) {
    if (row.surface === AnalyticsSurface.ADMIN || row.surface === AnalyticsSurface.REPORTS) {
      admin += row.count;
    } else if (
      row.surface === AnalyticsSurface.SURVEY
      || row.surface === AnalyticsSurface.DASHBOARD
    ) {
      respondent += row.count;
    } else {
      other += row.count;
    }
  }

  return { admin, respondent, other };
}

export function getCompletionEventRatio(summary: AnalyticsSummary): number {
  if (summary.surveyStarts <= 0) return 0;
  return summary.surveyCompletions / summary.surveyStarts;
}

export function getStatusSegments(
  counts: AnalyticsStatusCounts,
): Array<{ key: AnalyticsActionStatusType; label: string; value: number; color: string }> {
  return [
    {
      key: AnalyticsActionStatus.REQUESTED,
      label: 'Requested',
      value: counts.requested,
      color: 'var(--color-interactive)',
    },
    {
      key: AnalyticsActionStatus.SUCCEEDED,
      label: 'Succeeded',
      value: counts.succeeded,
      color: 'var(--severity-healthy-text)',
    },
    {
      key: AnalyticsActionStatus.FAILED,
      label: 'Failed',
      value: counts.failed,
      color: 'var(--severity-critical-border)',
    },
    {
      key: AnalyticsActionStatus.CANCELED,
      label: 'Canceled',
      value: counts.canceled,
      color: 'var(--grey-400)',
    },
  ];
}
