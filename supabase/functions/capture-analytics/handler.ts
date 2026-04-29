/**
 * Pure handler for first-party, cookie-free analytics capture.
 *
 * This file intentionally does not read IP address, user-agent, cookies, or
 * authorization headers. It validates a whitelisted payload and delegates the
 * aggregate-only write to the `record_analytics_event` RPC.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  EDGE_ANALYTICS_ACTION_STATUSES,
  EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS,
  EDGE_ANALYTICS_BUILD_ENVS,
  EDGE_ANALYTICS_EVENT_NAMES,
  EDGE_ANALYTICS_FORBIDDEN_FIELDS,
  EDGE_ANALYTICS_REPORT_FORMATS,
  EDGE_ANALYTICS_RESULTS_TABS,
  EDGE_ANALYTICS_ROLES,
  EDGE_ANALYTICS_ROUTE_TEMPLATES,
  EDGE_ANALYTICS_SURFACES,
  EDGE_ANALYTICS_SURVEY_RESOLUTION_STATUSES,
  EDGE_ANALYTICS_TIERS,
} from './contract.ts';

export type CaptureAnalyticsResult =
  | { status: 202; body: { success: true } }
  | { status: number; body: { error: string; message: string; fields?: string[] } };

type AnalyticsPayload = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_APP_VERSION_LENGTH = 80;

const EVENT_NAMES = new Set<string>(EDGE_ANALYTICS_EVENT_NAMES);
const SURFACES = new Set<string>(EDGE_ANALYTICS_SURFACES);
const ROUTE_TEMPLATES = new Set<string>(EDGE_ANALYTICS_ROUTE_TEMPLATES);
const ALLOWED_KEYS = new Set<string>(EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS);
const TIERS = new Set<string>(EDGE_ANALYTICS_TIERS);
const ROLES = new Set<string>(EDGE_ANALYTICS_ROLES);
const REPORT_FORMATS = new Set<string>(EDGE_ANALYTICS_REPORT_FORMATS);
const RESULTS_TABS = new Set<string>(EDGE_ANALYTICS_RESULTS_TABS);
const SURVEY_RESOLUTION_STATUSES = new Set<string>(EDGE_ANALYTICS_SURVEY_RESOLUTION_STATUSES);
const ACTION_STATUSES = new Set<string>(EDGE_ANALYTICS_ACTION_STATUSES);
const BUILD_ENVS = new Set<string>(EDGE_ANALYTICS_BUILD_ENVS);

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

const NORMALIZED_FORBIDDEN_FIELDS = new Set(
  EDGE_ANALYTICS_FORBIDDEN_FIELDS.map(normalizeFieldName),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findForbiddenFields(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenFields(item, `${prefix}[${index}]`));
  }

  if (!isRecord(value)) return [];

  const findings: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (NORMALIZED_FORBIDDEN_FIELDS.has(normalizeFieldName(key))) {
      findings.push(path);
    }
    findings.push(...findForbiddenFields(child, path));
  }
  return findings;
}

function requireString(payload: AnalyticsPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function optionalString(payload: AnalyticsPayload, key: string): string | null {
  const value = payload[key];
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'string' ? value : '__invalid__';
}

function validateEnum(
  payload: AnalyticsPayload,
  key: string,
  allowed: ReadonlySet<string>,
  errors: string[],
): void {
  const value = optionalString(payload, key);
  if (value !== null && !allowed.has(value)) {
    errors.push(key);
  }
}

function sanitizePayload(input: unknown): { payload: AnalyticsPayload } | { error: CaptureAnalyticsResult } {
  if (!isRecord(input)) {
    return {
      error: {
        status: 400,
        body: { error: 'INVALID_PAYLOAD', message: 'Analytics payload must be a JSON object.' },
      },
    };
  }

  const forbiddenFields = findForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return {
      error: {
        status: 400,
        body: {
          error: 'FORBIDDEN_FIELDS',
          message: 'Analytics payload contains fields that are not allowed.',
          fields: forbiddenFields,
        },
      },
    };
  }

  const unsupportedFields = Object.keys(input).filter((key) => !ALLOWED_KEYS.has(key));
  if (unsupportedFields.length > 0) {
    return {
      error: {
        status: 400,
        body: {
          error: 'UNSUPPORTED_FIELDS',
          message: 'Analytics payload contains unsupported fields.',
          fields: unsupportedFields,
        },
      },
    };
  }

  const errors: string[] = [];
  const eventName = requireString(input, 'eventName');
  const surface = requireString(input, 'surface');

  if (!eventName || !EVENT_NAMES.has(eventName)) errors.push('eventName');
  if (!surface || !SURFACES.has(surface)) errors.push('surface');

  validateEnum(input, 'routeTemplate', ROUTE_TEMPLATES, errors);
  validateEnum(input, 'tier', TIERS, errors);
  validateEnum(input, 'role', ROLES, errors);
  validateEnum(input, 'reportFormat', REPORT_FORMATS, errors);
  validateEnum(input, 'resultsTab', RESULTS_TABS, errors);
  validateEnum(input, 'surveyResolutionStatus', SURVEY_RESOLUTION_STATUSES, errors);
  validateEnum(input, 'actionStatus', ACTION_STATUSES, errors);
  validateEnum(input, 'buildEnv', BUILD_ENVS, errors);

  for (const uuidKey of ['organizationId', 'surveyId', 'deploymentId']) {
    const value = optionalString(input, uuidKey);
    if (value !== null && !UUID_RE.test(value)) {
      errors.push(uuidKey);
    }
  }

  const appVersion = optionalString(input, 'appVersion');
  if (appVersion !== null && (appVersion === '__invalid__' || appVersion.length > MAX_APP_VERSION_LENGTH)) {
    errors.push('appVersion');
  }

  if (errors.length > 0) {
    return {
      error: {
        status: 400,
        body: {
          error: 'INVALID_PAYLOAD',
          message: 'Analytics payload failed validation.',
          fields: Array.from(new Set(errors)),
        },
      },
    };
  }

  const sanitized: AnalyticsPayload = {};
  for (const key of EDGE_ANALYTICS_ALLOWED_PAYLOAD_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.trim() !== '') {
      sanitized[key] = value;
    }
  }

  return { payload: sanitized };
}

/** Validate and record one analytics event through the aggregate write RPC. */
export async function captureAnalytics(
  client: SupabaseClient,
  input: unknown,
): Promise<CaptureAnalyticsResult> {
  const sanitized = sanitizePayload(input);
  if ('error' in sanitized) return sanitized.error;

  const { error } = await client.rpc('record_analytics_event', {
    p_event: sanitized.payload,
  });

  if (error) {
    return {
      status: 500,
      body: {
        error: 'CAPTURE_FAILED',
        message: 'Analytics event could not be recorded.',
      },
    };
  }

  return { status: 202, body: { success: true } };
}
