/**
 * Shared loading fallback for lazy-loaded routes.
 *
 * Rendered inside `<Suspense fallback>` while a route-level chunk is being
 * fetched over the network. Kept intentionally small and dependency-free so
 * it ships inside the initial bundle.
 *
 * Uses a centered spinner with an announce-only `role="status"` + `aria-label`
 * so screen readers are informed the app is loading without flashing text.
 */

import type { ReactElement } from 'react';

/**
 * Centered spinner shown while a lazy route chunk is loading.
 *
 * Consumed by `<Suspense fallback={<RouteLoading />}>` inside each route
 * factory. Intentionally matches the existing inline spinner pattern used
 * in the survey shell (`border-2 border-[var(--grey-100)]`).
 */
export function RouteLoading(): ReactElement {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[var(--color-interactive)]"
        aria-hidden="true"
      />
    </div>
  );
}
