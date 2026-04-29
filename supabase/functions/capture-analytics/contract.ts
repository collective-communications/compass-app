/**
 * Local Edge Function copy of the analytics contract.
 *
 * Keep this in parity with `packages/types/src/analytics.ts`; the parity test
 * in this directory fails when the browser and Edge contracts drift.
 */

export const EDGE_ANALYTICS_EVENT_NAMES = [
  'route_viewed',
  'survey_deployment_resolved',
  'survey_edge_state_viewed',
  'survey_started',
  'survey_resumed',
  'survey_progress_saved',
  'survey_open_text_submitted',
  'survey_open_text_skipped',
  'survey_completed',
  'admin_client_selected',
  'survey_created',
  'survey_config_saved',
  'survey_published',
  'survey_unpublished',
  'survey_link_copied',
  'results_tab_viewed',
  'report_generation_requested',
  'report_download_requested',
] as const;

export const EDGE_ANALYTICS_SURFACES = [
  'public',
  'auth',
  'survey',
  'admin',
  'dashboard',
  'results',
  'reports',
  'settings',
  'help',
  'profile',
  'dev',
] as const;

export const EDGE_ANALYTICS_ROUTE_TEMPLATES = [
  '/',
  '/auth/login',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/forgot-password/sent',
  '/auth/reset-password',
  '/auth/accept-invite',
  '/clients',
  '/clients/$orgId',
  '/clients/$orgId/overview',
  '/clients/$orgId/surveys',
  '/clients/$orgId/users',
  '/clients/$orgId/settings',
  '/surveys/$surveyId',
  '/surveys/$surveyId/publish',
  '/users',
  '/recommendations',
  '/email-log',
  '/email-templates',
  '/analytics',
  '/dashboard',
  '/results/$surveyId',
  '/results/$surveyId/compass',
  '/results/$surveyId/survey',
  '/results/$surveyId/groups',
  '/results/$surveyId/dialogue',
  '/results/$surveyId/reports',
  '/results/$surveyId/recommendations',
  '/results/$surveyId/history',
  '/reports/$surveyId',
  '/settings',
  '/help',
  '/profile',
  '/s/$token',
  '/s/$token/q/$index',
  '/s/$token/open',
  '/s/$token/complete',
  '/s/$token/saved',
  '/dev/scoring',
  '*',
] as const;

export const EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS = [
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

export const EDGE_ANALYTICS_FORBIDDEN_FIELDS = [
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

export const EDGE_ANALYTICS_TIERS = ['tier_1', 'tier_2'] as const;

export const EDGE_ANALYTICS_ROLES = [
  'ccc_admin',
  'ccc_member',
  'client_exec',
  'client_director',
  'client_manager',
  'client_user',
] as const;

export const EDGE_ANALYTICS_REPORT_FORMATS = ['pdf', 'docx', 'pptx'] as const;

export const EDGE_ANALYTICS_RESULTS_TABS = [
  'compass',
  'survey',
  'groups',
  'dialogue',
  'reports',
  'recommendations',
  'history',
] as const;

export const EDGE_ANALYTICS_SURVEY_RESOLUTION_STATUSES = [
  'valid',
  'not_found',
  'closed',
  'expired',
  'not_yet_open',
  'already_completed',
  'error',
] as const;

export const EDGE_ANALYTICS_ACTION_STATUSES = [
  'requested',
  'succeeded',
  'failed',
  'canceled',
] as const;

export const EDGE_ANALYTICS_BUILD_ENVS = [
  'development',
  'preview',
  'production',
  'test',
] as const;
