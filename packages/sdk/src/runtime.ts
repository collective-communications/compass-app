/**
 * SDK runtime configuration.
 *
 * Holds the Supabase client (and optional session-scoped client factory + logger)
 * that every service module reads via {@link getClient} / {@link getSessionClient}
 * / {@link getLogger}. Callers — the web app, headless scripts, edge functions —
 * call {@link configureSdk} once at boot before invoking any service.
 *
 * The indirection lets every service module avoid hard-coding a singleton
 * supabase import (which previously forced web-only env-var resolution and
 * coupled the services to `apps/web/src/lib/supabase.ts`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@compass/types';

/**
 * Minimal logger contract. Any object with these four methods works — pino,
 * console, or a custom adapter. Each method receives a structured payload and
 * a message string, mirroring pino's signature.
 */
export interface Logger {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  debug: (obj: object, msg?: string) => void;
}

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

export interface SdkConfig {
  /** Default Supabase client used for authenticated/admin reads and writes. */
  client: SupabaseClient<Database>;
  /**
   * Factory that returns a per-respondent Supabase client carrying an
   * `x-session-token` header. Required for any survey respondent flow
   * (`saveResponse`, `upsertAnswer`, `submitResponse`, `resumeResponse`)
   * because anon RLS policies on `responses` and `answers` check that header.
   *
   * If omitted, respondent-flow calls throw at the point of use.
   */
  surveySessionClient?: (sessionToken: string) => SupabaseClient<Database>;
  /** Optional logger. Defaults to a no-op so headless callers stay quiet. */
  logger?: Logger;
}

let _config: SdkConfig | null = null;

/** Configure the SDK. Call once before invoking any service function. */
export function configureSdk(config: SdkConfig): void {
  _config = config;
}

/** Reset the SDK config — used by tests to isolate runs. */
export function resetSdk(): void {
  _config = null;
}

/** Returns the configured Supabase client, throwing a clear error if missing. */
export function getClient(): SupabaseClient<Database> {
  if (!_config) {
    throw new Error(
      '@compass/sdk has not been configured. Call configureSdk({ client }) before using any service function.',
    );
  }
  return _config.client;
}

/**
 * Returns a per-respondent Supabase client carrying `x-session-token`.
 * Throws if no factory was registered — survey respondent writes cannot
 * proceed without one (RLS would reject them).
 */
export function getSessionClient(sessionToken: string): SupabaseClient<Database> {
  if (!_config) {
    throw new Error('@compass/sdk has not been configured.');
  }
  if (!_config.surveySessionClient) {
    throw new Error(
      'configureSdk was called without `surveySessionClient`. Provide one to use survey respondent flows.',
    );
  }
  return _config.surveySessionClient(sessionToken);
}

/** Returns the configured logger, falling back to a no-op. */
export function getLogger(): Logger {
  return _config?.logger ?? noopLogger;
}
