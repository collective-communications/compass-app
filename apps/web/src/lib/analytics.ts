/**
 * First-party, cookie-free analytics client.
 *
 * The client never reads cookies, localStorage, sessionStorage, raw URLs, user
 * IDs, user emails, IPs, or user agents. It emits only whitelisted payloads to
 * the first-party Supabase Edge Function, and all failures are non-blocking.
 */
import {
  ANALYTICS_ALLOWED_PAYLOAD_KEYS,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_ROUTE_TEMPLATES,
  AnalyticsEventName,
  AnalyticsRouteTemplate,
  AnalyticsSurface,
  findAnalyticsForbiddenFields,
  type AnalyticsEventPayload,
  type AnalyticsResultsTab,
} from '@compass/types';
import { optionalEnv } from '@compass/utils';
import type { AuthUser } from '@compass/types';
import { logger } from './logger';

export interface ResolvedAnalyticsRoute {
  routeTemplate: AnalyticsRouteTemplate;
  surface: AnalyticsSurface;
  resultsTab?: AnalyticsResultsTab;
}

export interface AnalyticsTransport {
  send: (endpoint: string, payload: AnalyticsEventPayload) => boolean | Promise<boolean>;
}

interface RoutePattern {
  pattern: RegExp;
  routeTemplate: AnalyticsRouteTemplate;
  surface: AnalyticsSurface;
  resultsTab?: AnalyticsResultsTab;
}

const EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);
const ROUTE_TEMPLATES = new Set<string>(ANALYTICS_ROUTE_TEMPLATES);
const ALLOWED_KEYS = new Set<string>(ANALYTICS_ALLOWED_PAYLOAD_KEYS);

const ROUTE_PATTERNS: readonly RoutePattern[] = [
  { pattern: /^\/$/, routeTemplate: AnalyticsRouteTemplate.HOME, surface: AnalyticsSurface.PUBLIC },
  { pattern: /^\/auth\/login\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_LOGIN, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/auth\/callback\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_CALLBACK, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/auth\/forgot-password\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_FORGOT_PASSWORD, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/auth\/forgot-password\/sent\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_FORGOT_PASSWORD_SENT, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/auth\/reset-password\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_RESET_PASSWORD, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/auth\/accept-invite\/?$/, routeTemplate: AnalyticsRouteTemplate.AUTH_ACCEPT_INVITE, surface: AnalyticsSurface.AUTH },
  { pattern: /^\/clients\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENTS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/clients\/[^/]+\/overview\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENT_OVERVIEW, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/clients\/[^/]+\/surveys\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENT_SURVEYS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/clients\/[^/]+\/users\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENT_USERS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/clients\/[^/]+\/settings\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENT_SETTINGS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/clients\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.CLIENT_DETAIL, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/surveys\/[^/]+\/publish\/?$/, routeTemplate: AnalyticsRouteTemplate.SURVEY_PUBLISH, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/surveys\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.SURVEY_BUILDER, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/users\/?$/, routeTemplate: AnalyticsRouteTemplate.USERS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/recommendations\/?$/, routeTemplate: AnalyticsRouteTemplate.RECOMMENDATIONS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/email-log\/?$/, routeTemplate: AnalyticsRouteTemplate.EMAIL_LOG, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/email-templates\/?$/, routeTemplate: AnalyticsRouteTemplate.EMAIL_TEMPLATES, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/analytics\/?$/, routeTemplate: AnalyticsRouteTemplate.ANALYTICS, surface: AnalyticsSurface.ADMIN },
  { pattern: /^\/dashboard\/?$/, routeTemplate: AnalyticsRouteTemplate.DASHBOARD, surface: AnalyticsSurface.DASHBOARD },
  { pattern: /^\/results\/[^/]+\/compass\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_COMPASS, surface: AnalyticsSurface.RESULTS, resultsTab: 'compass' },
  { pattern: /^\/results\/[^/]+\/survey\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_SURVEY, surface: AnalyticsSurface.RESULTS, resultsTab: 'survey' },
  { pattern: /^\/results\/[^/]+\/groups\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_GROUPS, surface: AnalyticsSurface.RESULTS, resultsTab: 'groups' },
  { pattern: /^\/results\/[^/]+\/dialogue\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_DIALOGUE, surface: AnalyticsSurface.RESULTS, resultsTab: 'dialogue' },
  { pattern: /^\/results\/[^/]+\/reports\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_REPORTS, surface: AnalyticsSurface.RESULTS, resultsTab: 'reports' },
  { pattern: /^\/results\/[^/]+\/recommendations\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_RECOMMENDATIONS, surface: AnalyticsSurface.RESULTS, resultsTab: 'recommendations' },
  { pattern: /^\/results\/[^/]+\/history\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS_HISTORY, surface: AnalyticsSurface.RESULTS, resultsTab: 'history' },
  { pattern: /^\/results\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.RESULTS, surface: AnalyticsSurface.RESULTS },
  { pattern: /^\/reports\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.REPORTS, surface: AnalyticsSurface.REPORTS },
  { pattern: /^\/settings\/?$/, routeTemplate: AnalyticsRouteTemplate.SETTINGS, surface: AnalyticsSurface.SETTINGS },
  { pattern: /^\/help\/?$/, routeTemplate: AnalyticsRouteTemplate.HELP, surface: AnalyticsSurface.HELP },
  { pattern: /^\/profile\/?$/, routeTemplate: AnalyticsRouteTemplate.PROFILE, surface: AnalyticsSurface.PROFILE },
  { pattern: /^\/s\/[^/]+\/q\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.RESPONDENT_QUESTION, surface: AnalyticsSurface.SURVEY },
  { pattern: /^\/s\/[^/]+\/open\/?$/, routeTemplate: AnalyticsRouteTemplate.RESPONDENT_OPEN_ENDED, surface: AnalyticsSurface.SURVEY },
  { pattern: /^\/s\/[^/]+\/complete\/?$/, routeTemplate: AnalyticsRouteTemplate.RESPONDENT_COMPLETE, surface: AnalyticsSurface.SURVEY },
  { pattern: /^\/s\/[^/]+\/saved\/?$/, routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SAVED, surface: AnalyticsSurface.SURVEY },
  { pattern: /^\/s\/[^/]+\/?$/, routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SURVEY, surface: AnalyticsSurface.SURVEY },
  { pattern: /^\/dev\/scoring\/?$/, routeTemplate: AnalyticsRouteTemplate.DEV_SCORING, surface: AnalyticsSurface.DEV },
];

/** Resolve a raw pathname to a safe, token-free route template. */
export function resolveAnalyticsRoute(pathname: string): ResolvedAnalyticsRoute {
  const normalized = pathname.split(/[?#]/, 1)[0] || '/';
  const match = ROUTE_PATTERNS.find((candidate) => candidate.pattern.test(normalized));
  if (match) {
    return {
      routeTemplate: match.routeTemplate,
      surface: match.surface,
      resultsTab: match.resultsTab,
    };
  }
  return {
    routeTemplate: AnalyticsRouteTemplate.NOT_FOUND,
    surface: AnalyticsSurface.PUBLIC,
  };
}

function getAnalyticsEndpoint(): string | null {
  const supabaseUrl = optionalEnv('VITE_SUPABASE_URL', '').replace(/\/$/, '');
  return supabaseUrl ? `${supabaseUrl}/functions/v1/capture-analytics` : null;
}

function defaultTransport(): AnalyticsTransport {
  return {
    send(endpoint, payload): boolean | Promise<boolean> {
      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        const queued = navigator.sendBeacon(endpoint, blob);
        if (queued) return true;
      }

      if (typeof fetch === 'undefined') return false;
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'omit',
      }).then((response) => response.ok);
    },
  };
}

function sanitizeAnalyticsPayload(payload: AnalyticsEventPayload): AnalyticsEventPayload | null {
  if (!EVENT_NAMES.has(payload.eventName)) return null;
  if (payload.routeTemplate && !ROUTE_TEMPLATES.has(payload.routeTemplate)) return null;
  if (findAnalyticsForbiddenFields(payload).length > 0) return null;

  const sanitized: Partial<AnalyticsEventPayload> = {};
  for (const key of ANALYTICS_ALLOWED_PAYLOAD_KEYS) {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== '') {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }

  for (const key of Object.keys(sanitized)) {
    if (!ALLOWED_KEYS.has(key)) return null;
  }

  return sanitized as AnalyticsEventPayload;
}

/** Emit one analytics event without blocking the user interaction. */
export function captureProductEvent(
  payload: AnalyticsEventPayload,
  options: {
    endpoint?: string | null;
    transport?: AnalyticsTransport;
  } = {},
): void {
  const sanitized = sanitizeAnalyticsPayload(payload);
  const endpoint = options.endpoint ?? getAnalyticsEndpoint();
  if (!sanitized || !endpoint) return;

  const transport = options.transport ?? defaultTransport();
  try {
    void Promise.resolve(transport.send(endpoint, sanitized)).catch((err: unknown) => {
      logger.debug({ err, fn: 'captureProductEvent' }, 'Analytics capture failed');
    });
  } catch (err) {
    logger.debug({ err, fn: 'captureProductEvent' }, 'Analytics capture failed');
  }
}

/** Emit a route-view event using a safe route template instead of the raw path. */
export function captureRouteView(
  pathname: string,
  user?: AuthUser | null,
  options?: {
    endpoint?: string | null;
    transport?: AnalyticsTransport;
  },
): void {
  const route = resolveAnalyticsRoute(pathname);
  captureProductEvent({
    eventName: AnalyticsEventName.ROUTE_VIEWED,
    surface: route.surface,
    routeTemplate: route.routeTemplate,
    resultsTab: route.resultsTab,
    organizationId: user?.organizationId ?? undefined,
    tier: user?.tier,
    role: user?.role,
    buildEnv: import.meta.env.MODE === 'production' ? 'production' : 'development',
    appVersion: import.meta.env.VITE_APP_VERSION,
  }, options);
}
