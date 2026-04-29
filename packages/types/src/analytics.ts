/**
 * Cookie-free analytics contract.
 *
 * This module defines the only analytics event names, route templates, and
 * payload keys the app may emit. Keep the contract intentionally narrow:
 * analytics is for aggregate product understanding, not visitor profiling.
 */
import type { UserRole, UserTier } from './auth';
import type { ReportFormat } from './report';

// Event Names

/** Whitelisted analytics events. */
export const AnalyticsEventName = {
  ROUTE_VIEWED: 'route_viewed',
  SURVEY_DEPLOYMENT_RESOLVED: 'survey_deployment_resolved',
  SURVEY_EDGE_STATE_VIEWED: 'survey_edge_state_viewed',
  SURVEY_STARTED: 'survey_started',
  SURVEY_RESUMED: 'survey_resumed',
  SURVEY_PROGRESS_SAVED: 'survey_progress_saved',
  SURVEY_OPEN_TEXT_SUBMITTED: 'survey_open_text_submitted',
  SURVEY_OPEN_TEXT_SKIPPED: 'survey_open_text_skipped',
  SURVEY_COMPLETED: 'survey_completed',
  ADMIN_CLIENT_SELECTED: 'admin_client_selected',
  SURVEY_CREATED: 'survey_created',
  SURVEY_CONFIG_SAVED: 'survey_config_saved',
  SURVEY_PUBLISHED: 'survey_published',
  SURVEY_UNPUBLISHED: 'survey_unpublished',
  SURVEY_LINK_COPIED: 'survey_link_copied',
  RESULTS_TAB_VIEWED: 'results_tab_viewed',
  REPORT_GENERATION_REQUESTED: 'report_generation_requested',
  REPORT_DOWNLOAD_REQUESTED: 'report_download_requested',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEventName)[keyof typeof AnalyticsEventName];

/** Runtime list for validators and Edge Function allowlists. */
export const ANALYTICS_EVENT_NAMES = Object.values(AnalyticsEventName) as readonly AnalyticsEventName[];

// Surfaces and Routes

/** Product surfaces used for aggregate reporting. */
export const AnalyticsSurface = {
  PUBLIC: 'public',
  AUTH: 'auth',
  SURVEY: 'survey',
  ADMIN: 'admin',
  DASHBOARD: 'dashboard',
  RESULTS: 'results',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  HELP: 'help',
  PROFILE: 'profile',
  DEV: 'dev',
} as const;

export type AnalyticsSurface = (typeof AnalyticsSurface)[keyof typeof AnalyticsSurface];

/**
 * Route templates are safe to persist. They must contain route placeholders,
 * never the raw path from `window.location`.
 */
export const AnalyticsRouteTemplate = {
  HOME: '/',
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_FORGOT_PASSWORD_SENT: '/auth/forgot-password/sent',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_ACCEPT_INVITE: '/auth/accept-invite',
  CLIENTS: '/clients',
  CLIENT_DETAIL: '/clients/$orgId',
  CLIENT_OVERVIEW: '/clients/$orgId/overview',
  CLIENT_SURVEYS: '/clients/$orgId/surveys',
  CLIENT_USERS: '/clients/$orgId/users',
  CLIENT_SETTINGS: '/clients/$orgId/settings',
  SURVEY_BUILDER: '/surveys/$surveyId',
  SURVEY_PUBLISH: '/surveys/$surveyId/publish',
  USERS: '/users',
  RECOMMENDATIONS: '/recommendations',
  EMAIL_LOG: '/email-log',
  EMAIL_TEMPLATES: '/email-templates',
  ANALYTICS: '/analytics',
  DASHBOARD: '/dashboard',
  RESULTS: '/results/$surveyId',
  RESULTS_COMPASS: '/results/$surveyId/compass',
  RESULTS_SURVEY: '/results/$surveyId/survey',
  RESULTS_GROUPS: '/results/$surveyId/groups',
  RESULTS_DIALOGUE: '/results/$surveyId/dialogue',
  RESULTS_REPORTS: '/results/$surveyId/reports',
  RESULTS_RECOMMENDATIONS: '/results/$surveyId/recommendations',
  RESULTS_HISTORY: '/results/$surveyId/history',
  REPORTS: '/reports/$surveyId',
  SETTINGS: '/settings',
  HELP: '/help',
  PROFILE: '/profile',
  RESPONDENT_SURVEY: '/s/$token',
  RESPONDENT_QUESTION: '/s/$token/q/$index',
  RESPONDENT_OPEN_ENDED: '/s/$token/open',
  RESPONDENT_COMPLETE: '/s/$token/complete',
  RESPONDENT_SAVED: '/s/$token/saved',
  DEV_SCORING: '/dev/scoring',
  NOT_FOUND: '*',
} as const;

export type AnalyticsRouteTemplate =
  (typeof AnalyticsRouteTemplate)[keyof typeof AnalyticsRouteTemplate];

/** Runtime list for route-template validation. */
export const ANALYTICS_ROUTE_TEMPLATES = Object.values(
  AnalyticsRouteTemplate,
) as readonly AnalyticsRouteTemplate[];

// Event Dimensions

/** Results tabs that are meaningful for analytics. */
export const AnalyticsResultsTab = {
  COMPASS: 'compass',
  SURVEY: 'survey',
  GROUPS: 'groups',
  DIALOGUE: 'dialogue',
  REPORTS: 'reports',
  RECOMMENDATIONS: 'recommendations',
  HISTORY: 'history',
} as const;

export type AnalyticsResultsTab = (typeof AnalyticsResultsTab)[keyof typeof AnalyticsResultsTab];

/** Deployment resolver outcomes safe to count. */
export const AnalyticsSurveyResolutionStatus = {
  VALID: 'valid',
  NOT_FOUND: 'not_found',
  CLOSED: 'closed',
  EXPIRED: 'expired',
  NOT_YET_OPEN: 'not_yet_open',
  ALREADY_COMPLETED: 'already_completed',
  ERROR: 'error',
} as const;

export type AnalyticsSurveyResolutionStatus =
  (typeof AnalyticsSurveyResolutionStatus)[keyof typeof AnalyticsSurveyResolutionStatus];

/** Coarse action state for aggregate counts. */
export const AnalyticsActionStatus = {
  REQUESTED: 'requested',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type AnalyticsActionStatus = (typeof AnalyticsActionStatus)[keyof typeof AnalyticsActionStatus];

/** Build environments safe to include in analytics aggregates. */
export const AnalyticsBuildEnvironment = {
  DEVELOPMENT: 'development',
  PREVIEW: 'preview',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type AnalyticsBuildEnvironment =
  (typeof AnalyticsBuildEnvironment)[keyof typeof AnalyticsBuildEnvironment];

// Payload Contract

/** Keys the browser may send to the first-party analytics endpoint. */
export const ANALYTICS_ALLOWED_PAYLOAD_KEYS = [
  'eventName',
  'surface',
  'routeTemplate',
  'organizationId',
  'surveyId',
  'deploymentId',
  'tier',
  'role',
  'reportFormat',
  'resultsTab',
  'surveyResolutionStatus',
  'actionStatus',
  'buildEnv',
  'appVersion',
] as const;

export type AnalyticsAllowedPayloadKey = (typeof ANALYTICS_ALLOWED_PAYLOAD_KEYS)[number];

/** Analytics payload emitted by the browser and validated by the Edge Function. */
export interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  surface: AnalyticsSurface;
  routeTemplate?: AnalyticsRouteTemplate;
  organizationId?: string;
  surveyId?: string;
  deploymentId?: string;
  tier?: UserTier;
  role?: UserRole;
  reportFormat?: ReportFormat;
  resultsTab?: AnalyticsResultsTab;
  surveyResolutionStatus?: AnalyticsSurveyResolutionStatus;
  actionStatus?: AnalyticsActionStatus;
  buildEnv?: AnalyticsBuildEnvironment;
  appVersion?: string;
}

/** Simple labelled aggregate count returned by analytics summary RPCs. */
export interface AnalyticsNamedCount {
  count: number;
}

export interface AnalyticsEventCount extends AnalyticsNamedCount {
  eventName: AnalyticsEventName;
}

export interface AnalyticsSurfaceCount extends AnalyticsNamedCount {
  surface: AnalyticsSurface;
}

export interface AnalyticsRouteCount extends AnalyticsNamedCount {
  routeTemplate: AnalyticsRouteTemplate;
}

export interface AnalyticsResultsTabCount extends AnalyticsNamedCount {
  resultsTab: AnalyticsResultsTab;
}

export interface AnalyticsSurveyResolutionStatusCount extends AnalyticsNamedCount {
  status: AnalyticsSurveyResolutionStatus;
}

export interface AnalyticsActionStatusCount extends AnalyticsNamedCount {
  eventName: AnalyticsEventName;
  actionStatus: AnalyticsActionStatus;
}

export interface AnalyticsReportFormatCount extends AnalyticsNamedCount {
  reportFormat: ReportFormat;
}

export interface AnalyticsOrganizationCount extends AnalyticsNamedCount {
  organizationId: string;
  organizationName: string;
}

export interface AnalyticsDailyTotal extends AnalyticsNamedCount {
  date: string;
}

/** Aggregate analytics summary returned to authorized CC+C users. */
export interface AnalyticsSummary {
  startDate: string;
  endDate: string;
  minimumReportableCount: number;
  totalEvents: number;
  routeViews: number;
  surveyStarts: number;
  surveyCompletions: number;
  reportGenerations: number;
  reportDownloads: number;
  activeOrganizations: number;
  activeSurveys: number;
  byEvent: AnalyticsEventCount[];
  bySurface: AnalyticsSurfaceCount[];
  routeViewsByRoute: AnalyticsRouteCount[];
  resultsTabs: AnalyticsResultsTabCount[];
  surveyResolutionStatuses: AnalyticsSurveyResolutionStatusCount[];
  actionStatuses: AnalyticsActionStatusCount[];
  reportFormats: AnalyticsReportFormatCount[];
  topOrganizations: AnalyticsOrganizationCount[];
  dailyTotals: AnalyticsDailyTotal[];
}

/** v1 stores aggregate counters only; raw analytics events are not retained. */
export const ANALYTICS_RETENTION_POLICY = {
  rawEventRetentionDays: 0,
  aggregateGrain: 'day',
  minimumReportableCount: 5,
} as const;

/** Non-negotiable collection rules for analytics implementations. */
export const ANALYTICS_COLLECTION_RULES = {
  analyticsCookiesAllowed: false,
  storageVisitorIdsAllowed: false,
  thirdPartyTrackingAllowed: false,
  rawIpAllowed: false,
  ipHashAllowed: false,
  rawUserAgentAllowed: false,
  userIdAllowed: false,
  fullUrlAllowed: false,
  surveyTokenAllowed: false,
  answerValuesAllowed: false,
  openTextAllowed: false,
  rawEventPersistenceAllowed: false,
} as const;

// Forbidden Field Detection

/** Field names that must never appear in analytics payloads. */
export const ANALYTICS_FORBIDDEN_FIELDS = [
  'answer',
  'answer_value',
  'answers',
  'browser_fingerprint',
  'deployment_token',
  'device_fingerprint',
  'email',
  'fingerprint',
  'full_url',
  'hash',
  'invitation_token',
  'ip',
  'ip_address',
  'ip_hash',
  'open_text',
  'path',
  'query',
  'raw_ip',
  'raw_user_agent',
  'recipient_email',
  'report_url',
  'session_cookie',
  'session_token',
  'signed_url',
  'storage_path',
  'survey_token',
  'text',
  'token',
  'url',
  'user_agent',
  'user_email',
  'user_id',
  'visitor_id',
] as const;

export type AnalyticsForbiddenField = (typeof ANALYTICS_FORBIDDEN_FIELDS)[number];

function normalizeAnalyticsFieldName(fieldName: string): string {
  return fieldName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

const NORMALIZED_FORBIDDEN_FIELDS: ReadonlySet<string> = new Set(
  ANALYTICS_FORBIDDEN_FIELDS.map(normalizeAnalyticsFieldName),
);

/**
 * Return true when a field name is explicitly forbidden for analytics.
 *
 * The check normalizes snake_case, kebab-case, and camelCase into the same
 * comparison form so validators catch common naming variants.
 */
export function isAnalyticsForbiddenField(fieldName: string): boolean {
  return NORMALIZED_FORBIDDEN_FIELDS.has(normalizeAnalyticsFieldName(fieldName));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Find forbidden field names anywhere inside an analytics-like payload.
 *
 * The returned paths are diagnostic only; callers should reject the payload
 * whenever this returns any entries.
 */
export function findAnalyticsForbiddenFields(payload: unknown): string[] {
  const findings: string[] = [];

  function visit(value: unknown, prefix: string): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${prefix}[${index}]`));
      return;
    }

    if (!isRecord(value)) return;

    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isAnalyticsForbiddenField(key)) {
        findings.push(path);
      }
      visit(child, path);
    }
  }

  visit(payload, '');
  return findings;
}

/** Return true when the payload contains one or more forbidden fields. */
export function hasAnalyticsForbiddenFields(payload: unknown): boolean {
  return findAnalyticsForbiddenFields(payload).length > 0;
}
