import { describe, expect, test } from 'bun:test';
import {
  ANALYTICS_ALLOWED_PAYLOAD_KEYS,
  ANALYTICS_COLLECTION_RULES,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_ROUTE_TEMPLATES,
  ANALYTICS_RETENTION_POLICY,
  AnalyticsEventName,
  AnalyticsRouteTemplate,
  findAnalyticsForbiddenFields,
  hasAnalyticsForbiddenFields,
  isAnalyticsForbiddenField,
} from './analytics.js';

describe('analytics contract', () => {
  test('keeps v1 aggregate-only with no raw event retention', () => {
    expect(ANALYTICS_RETENTION_POLICY.rawEventRetentionDays).toBe(0);
    expect(ANALYTICS_RETENTION_POLICY.aggregateGrain).toBe('day');
    expect(ANALYTICS_COLLECTION_RULES.rawEventPersistenceAllowed).toBe(false);
    expect(ANALYTICS_COLLECTION_RULES.analyticsCookiesAllowed).toBe(false);
    expect(ANALYTICS_COLLECTION_RULES.storageVisitorIdsAllowed).toBe(false);
    expect(ANALYTICS_COLLECTION_RULES.thirdPartyTrackingAllowed).toBe(false);
  });

  test('exports expected initial event taxonomy', () => {
    expect(ANALYTICS_EVENT_NAMES).toContain(AnalyticsEventName.ROUTE_VIEWED);
    expect(ANALYTICS_EVENT_NAMES).toContain(AnalyticsEventName.SURVEY_STARTED);
    expect(ANALYTICS_EVENT_NAMES).toContain(AnalyticsEventName.SURVEY_COMPLETED);
    expect(ANALYTICS_EVENT_NAMES).toContain(AnalyticsEventName.RESULTS_TAB_VIEWED);
    expect(ANALYTICS_EVENT_NAMES).toContain(AnalyticsEventName.REPORT_DOWNLOAD_REQUESTED);
  });

  test('exports the admin analytics route template', () => {
    expect(ANALYTICS_ROUTE_TEMPLATES).toContain(AnalyticsRouteTemplate.ANALYTICS);
    expect(AnalyticsRouteTemplate.ANALYTICS).toBe('/analytics');
  });

  test('uses route templates for respondent paths', () => {
    expect(ANALYTICS_ROUTE_TEMPLATES).toContain(AnalyticsRouteTemplate.RESPONDENT_SURVEY);
    expect(ANALYTICS_ROUTE_TEMPLATES).toContain(AnalyticsRouteTemplate.RESPONDENT_QUESTION);
    expect(AnalyticsRouteTemplate.RESPONDENT_SURVEY).toBe('/s/$token');
    expect(AnalyticsRouteTemplate.RESPONDENT_QUESTION).toBe('/s/$token/q/$index');
  });

  test('allowed payload keys are not forbidden fields', () => {
    for (const key of ANALYTICS_ALLOWED_PAYLOAD_KEYS) {
      expect(isAnalyticsForbiddenField(key)).toBe(false);
    }
  });

  test('detects forbidden field naming variants', () => {
    expect(isAnalyticsForbiddenField('ip_hash')).toBe(true);
    expect(isAnalyticsForbiddenField('ipHash')).toBe(true);
    expect(isAnalyticsForbiddenField('user_id')).toBe(true);
    expect(isAnalyticsForbiddenField('userId')).toBe(true);
    expect(isAnalyticsForbiddenField('raw-user-agent')).toBe(true);
    expect(isAnalyticsForbiddenField('surveyToken')).toBe(true);
    expect(isAnalyticsForbiddenField('routeTemplate')).toBe(false);
  });

  test('finds forbidden fields inside nested payloads', () => {
    const payload = {
      eventName: AnalyticsEventName.ROUTE_VIEWED,
      surface: 'survey',
      routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SURVEY,
      metadata: {
        userAgent: 'Mozilla/5.0',
      },
      events: [
        {
          openText: 'Never collect this',
        },
      ],
    };

    expect(hasAnalyticsForbiddenFields(payload)).toBe(true);
    expect(findAnalyticsForbiddenFields(payload)).toEqual([
      'metadata.userAgent',
      'events[0].openText',
    ]);
  });
});
