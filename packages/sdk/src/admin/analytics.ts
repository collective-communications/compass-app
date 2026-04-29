/**
 * Admin analytics service.
 *
 * Reads aggregate-only analytics through the authorized RPC. The SDK never
 * queries the underlying analytics table directly.
 */
import type {
  AnalyticsActionStatusCount,
  AnalyticsDailyTotal,
  AnalyticsEventCount,
  AnalyticsOrganizationCount,
  AnalyticsReportFormatCount,
  AnalyticsResultsTabCount,
  AnalyticsRouteCount,
  AnalyticsSummary,
  AnalyticsSurfaceCount,
  AnalyticsSurveyResolutionStatusCount,
} from '@compass/types';
import { getClient, getLogger } from '../runtime';

export interface AnalyticsSummaryParams {
  startDate?: string;
  endDate?: string;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => (
        typeof item === 'object' && item !== null && !Array.isArray(item)
      ))
    : [];
}

function mapCountArray<T>(
  value: unknown,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  return asArray(value).map(mapper);
}

function mapAnalyticsSummary(raw: unknown): AnalyticsSummary {
  const payload = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  return {
    startDate: asString(payload['startDate']),
    endDate: asString(payload['endDate']),
    minimumReportableCount: asNumber(payload['minimumReportableCount']),
    totalEvents: asNumber(payload['totalEvents']),
    routeViews: asNumber(payload['routeViews']),
    surveyStarts: asNumber(payload['surveyStarts']),
    surveyCompletions: asNumber(payload['surveyCompletions']),
    reportGenerations: asNumber(payload['reportGenerations']),
    reportDownloads: asNumber(payload['reportDownloads']),
    activeOrganizations: asNumber(payload['activeOrganizations']),
    activeSurveys: asNumber(payload['activeSurveys']),
    byEvent: mapCountArray(payload['byEvent'], (row): AnalyticsEventCount => ({
      eventName: asString(row['eventName']) as AnalyticsEventCount['eventName'],
      count: asNumber(row['count']),
    })),
    bySurface: mapCountArray(payload['bySurface'], (row): AnalyticsSurfaceCount => ({
      surface: asString(row['surface']) as AnalyticsSurfaceCount['surface'],
      count: asNumber(row['count']),
    })),
    routeViewsByRoute: mapCountArray(payload['routeViewsByRoute'], (row): AnalyticsRouteCount => ({
      routeTemplate: asString(row['routeTemplate']) as AnalyticsRouteCount['routeTemplate'],
      count: asNumber(row['count']),
    })),
    resultsTabs: mapCountArray(payload['resultsTabs'], (row): AnalyticsResultsTabCount => ({
      resultsTab: asString(row['resultsTab']) as AnalyticsResultsTabCount['resultsTab'],
      count: asNumber(row['count']),
    })),
    surveyResolutionStatuses: mapCountArray(
      payload['surveyResolutionStatuses'],
      (row): AnalyticsSurveyResolutionStatusCount => ({
        status: asString(row['status']) as AnalyticsSurveyResolutionStatusCount['status'],
        count: asNumber(row['count']),
      }),
    ),
    actionStatuses: mapCountArray(payload['actionStatuses'], (row): AnalyticsActionStatusCount => ({
      eventName: asString(row['eventName']) as AnalyticsActionStatusCount['eventName'],
      actionStatus: asString(row['actionStatus']) as AnalyticsActionStatusCount['actionStatus'],
      count: asNumber(row['count']),
    })),
    reportFormats: mapCountArray(payload['reportFormats'], (row): AnalyticsReportFormatCount => ({
      reportFormat: asString(row['reportFormat']) as AnalyticsReportFormatCount['reportFormat'],
      count: asNumber(row['count']),
    })),
    topOrganizations: mapCountArray(payload['topOrganizations'], (row): AnalyticsOrganizationCount => ({
      organizationId: asString(row['organizationId']),
      organizationName: asString(row['organizationName']),
      count: asNumber(row['count']),
    })),
    dailyTotals: mapCountArray(payload['dailyTotals'], (row): AnalyticsDailyTotal => ({
      date: asString(row['date']),
      count: asNumber(row['count']),
    })),
  };
}

/** Fetch the aggregate analytics summary for authorized CC+C users. */
export async function getAnalyticsSummary(
  params: AnalyticsSummaryParams = {},
): Promise<AnalyticsSummary> {
  const supabase = getClient();
  const logger = getLogger();

  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });

  if (error) {
    logger.error({ err: error, fn: 'getAnalyticsSummary' }, 'Failed to fetch analytics summary');
    throw error;
  }

  return mapAnalyticsSummary(data);
}
