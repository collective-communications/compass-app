import { afterEach, describe, expect, test } from 'bun:test';
import { configureSdk, resetSdk } from '../runtime';
import { getAnalyticsSummary } from './analytics';

describe('admin analytics service', () => {
  afterEach(() => {
    resetSdk();
  });

  test('getAnalyticsSummary maps the aggregate RPC payload', async () => {
    let rpcName = '';
    let rpcArgs: Record<string, unknown> | null = null;

    configureSdk({
      client: {
        rpc: async (name: string, args: Record<string, unknown>) => {
          rpcName = name;
          rpcArgs = args;
          return {
            data: {
              startDate: '2026-04-01',
              endDate: '2026-04-29',
              minimumReportableCount: 5,
              totalEvents: 12,
              routeViews: 7,
              surveyStarts: 2,
              surveyCompletions: 1,
              reportGenerations: 1,
              reportDownloads: 1,
              activeOrganizations: 2,
              activeSurveys: 3,
              byEvent: [{ eventName: 'route_viewed', count: 7 }],
              bySurface: [{ surface: 'survey', count: 5 }],
              routeViewsByRoute: [{ routeTemplate: '/s/$token', count: 4 }],
              resultsTabs: [{ resultsTab: 'compass', count: 2 }],
              surveyResolutionStatuses: [{ status: 'valid', count: 3 }],
              actionStatuses: [
                { eventName: 'report_generation_requested', actionStatus: 'succeeded', count: 1 },
              ],
              reportFormats: [{ reportFormat: 'pdf', count: 1 }],
              topOrganizations: [{
                organizationId: 'org-1',
                organizationName: 'Acme',
                count: 6,
              }],
              dailyTotals: [{ date: '2026-04-29', count: 12 }],
            },
            error: null,
          };
        },
      } as never,
    });

    const summary = await getAnalyticsSummary({
      startDate: '2026-04-01',
      endDate: '2026-04-29',
    });

    expect(rpcName).toBe('get_analytics_summary');
    expect(rpcArgs).toEqual({
      p_start_date: '2026-04-01',
      p_end_date: '2026-04-29',
    });
    expect(summary.totalEvents).toBe(12);
    expect(summary.byEvent[0]).toEqual({ eventName: 'route_viewed', count: 7 });
    expect(summary.actionStatuses[0]).toEqual({
      eventName: 'report_generation_requested',
      actionStatus: 'succeeded',
      count: 1,
    });
    expect(summary.reportFormats[0]).toEqual({ reportFormat: 'pdf', count: 1 });
    expect(summary.topOrganizations[0]?.organizationName).toBe('Acme');
  });

  test('getAnalyticsSummary throws RPC errors', async () => {
    configureSdk({
      client: {
        rpc: async () => ({
          data: null,
          error: { message: 'permission denied' },
        }),
      } as never,
    });

    await expect(getAnalyticsSummary()).rejects.toMatchObject({
      message: 'permission denied',
    });
  });
});
