/**
 * Canonical TanStack Query cache policy for the web app.
 *
 * Centralising `staleTime` values here keeps the app's caching behaviour
 * auditable in one place. Call sites should reference {@link STALE_TIMES}
 * by name (e.g. `STALE_TIMES.results`) rather than inlining magic numbers,
 * so tuning the policy is a one-file change.
 */

/**
 * Canonical staleTime values for TanStack Query usage across the app.
 * Prefer these over inline magic numbers so the cache policy is auditable in one place.
 */
export const STALE_TIMES = {
  /** 30s — for highly dynamic lists like org directories */
  fast: 30_000,
  /** 1min — for moderately dynamic data like per-client state */
  default: 60_000,
  /** 5min — default for results/dashboard reads that don't change mid-session */
  results: 5 * 60 * 1000,
  /** 10min — for near-static data like question catalogues */
  static: 10 * 60 * 1000,
} as const;

export type StaleTimeKey = keyof typeof STALE_TIMES;
