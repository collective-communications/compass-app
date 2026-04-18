/**
 * Shared TanStack Query key factories — keys consumed by multiple features.
 *
 * Feature-local keys live in the feature's `lib/query-keys.ts` (e.g.
 * `features/results/lib/query-keys.ts`). Move a key here when it's used
 * across feature boundaries, to avoid cross-feature internal imports.
 */

/** Keys for survey metadata queries consumed by multiple features. */
export const surveyQueryKeys = {
  all: ['surveys'] as const,

  /** Scored survey list for an organization (used by results + reports). */
  scoredSurveys: (orgId: string) =>
    [...surveyQueryKeys.all, 'scored', orgId] as const,
};
