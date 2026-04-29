import { describe, expect, test } from 'bun:test';
import {
  ANALYTICS_ALLOWED_PAYLOAD_KEYS,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_FORBIDDEN_FIELDS,
  ANALYTICS_ROUTE_TEMPLATES,
  AnalyticsActionStatus,
  AnalyticsBuildEnvironment,
  AnalyticsResultsTab,
  AnalyticsSurface,
  AnalyticsSurveyResolutionStatus,
  UserRole,
} from '../../../packages/types/src/index.js';
import {
  EDGE_ANALYTICS_ACTION_STATUSES,
  EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS,
  EDGE_ANALYTICS_BUILD_ENVS,
  EDGE_ANALYTICS_EVENT_NAMES,
  EDGE_ANALYTICS_FORBIDDEN_FIELDS,
  EDGE_ANALYTICS_RESULTS_TABS,
  EDGE_ANALYTICS_ROLES,
  EDGE_ANALYTICS_ROUTE_TEMPLATES,
  EDGE_ANALYTICS_SURFACES,
  EDGE_ANALYTICS_SURVEY_RESOLUTION_STATUSES,
} from './contract.ts';

function values<T extends Record<string, string>>(record: T): string[] {
  return Object.values(record);
}

describe('capture analytics contract parity', () => {
  test('edge function contract matches shared package taxonomy', () => {
    expect([...EDGE_ANALYTICS_EVENT_NAMES]).toEqual([...ANALYTICS_EVENT_NAMES]);
    expect([...EDGE_ANALYTICS_ROUTE_TEMPLATES]).toEqual([...ANALYTICS_ROUTE_TEMPLATES]);
    expect([...EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS]).toEqual([...ANALYTICS_ALLOWED_PAYLOAD_KEYS]);
    expect([...EDGE_ANALYTICS_FORBIDDEN_FIELDS]).toEqual([...ANALYTICS_FORBIDDEN_FIELDS]);
    expect([...EDGE_ANALYTICS_SURFACES]).toEqual(values(AnalyticsSurface));
    expect([...EDGE_ANALYTICS_ROLES]).toEqual(values(UserRole));
    expect([...EDGE_ANALYTICS_RESULTS_TABS]).toEqual(values(AnalyticsResultsTab));
    expect([...EDGE_ANALYTICS_SURVEY_RESOLUTION_STATUSES]).toEqual(
      values(AnalyticsSurveyResolutionStatus),
    );
    expect([...EDGE_ANALYTICS_ACTION_STATUSES]).toEqual(values(AnalyticsActionStatus));
    expect([...EDGE_ANALYTICS_BUILD_ENVS]).toEqual(values(AnalyticsBuildEnvironment));
  });
});
