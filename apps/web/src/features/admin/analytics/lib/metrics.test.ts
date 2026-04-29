import { describe, expect, test } from 'bun:test';
import {
  AnalyticsActionStatus,
  AnalyticsEventName,
  AnalyticsSurface,
  type AnalyticsSummary,
} from '@compass/types';
import {
  getActionStatusCounts,
  getAudienceSplit,
  getCompletionEventRatio,
  getNormalizedDailyTotals,
  isAnalyticsSummaryEmpty,
} from './metrics';

function makeSummary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    startDate: '2026-04-27',
    endDate: '2026-04-29',
    minimumReportableCount: 5,
    totalEvents: 10,
    routeViews: 3,
    surveyStarts: 4,
    surveyCompletions: 2,
    reportGenerations: 1,
    reportDownloads: 1,
    activeOrganizations: 1,
    activeSurveys: 1,
    byEvent: [],
    bySurface: [],
    routeViewsByRoute: [],
    resultsTabs: [],
    surveyResolutionStatuses: [],
    actionStatuses: [],
    reportFormats: [],
    topOrganizations: [],
    dailyTotals: [],
    ...overrides,
  };
}

describe('analytics metric helpers', () => {
  test('fills missing daily totals with zero-count dates', () => {
    expect(getNormalizedDailyTotals(makeSummary({
      dailyTotals: [
        { date: '2026-04-27', count: 3 },
        { date: '2026-04-29', count: 7 },
      ],
    }))).toEqual([
      { date: '2026-04-27', count: 3 },
      { date: '2026-04-28', count: 0 },
      { date: '2026-04-29', count: 7 },
    ]);
  });

  test('groups action statuses by event', () => {
    expect(getActionStatusCounts(makeSummary({
      actionStatuses: [
        {
          eventName: AnalyticsEventName.SURVEY_PUBLISHED,
          actionStatus: AnalyticsActionStatus.SUCCEEDED,
          count: 2,
        },
        {
          eventName: AnalyticsEventName.SURVEY_PUBLISHED,
          actionStatus: AnalyticsActionStatus.FAILED,
          count: 1,
        },
      ],
    }), AnalyticsEventName.SURVEY_PUBLISHED)).toEqual({
      requested: 0,
      succeeded: 2,
      failed: 1,
      canceled: 0,
    });
  });

  test('derives audience split from safe surfaces', () => {
    expect(getAudienceSplit(makeSummary({
      bySurface: [
        { surface: AnalyticsSurface.ADMIN, count: 5 },
        { surface: AnalyticsSurface.REPORTS, count: 2 },
        { surface: AnalyticsSurface.SURVEY, count: 3 },
        { surface: AnalyticsSurface.AUTH, count: 1 },
      ],
    }))).toEqual({ admin: 7, respondent: 3, other: 1 });
  });

  test('keeps completion ratio event-based', () => {
    expect(getCompletionEventRatio(makeSummary())).toBe(0.5);
    expect(getCompletionEventRatio(makeSummary({ surveyStarts: 0 }))).toBe(0);
  });

  test('recognizes empty summaries', () => {
    expect(isAnalyticsSummaryEmpty(makeSummary({
      totalEvents: 0,
      dailyTotals: [],
      byEvent: [],
    }))).toBe(true);
  });
});
