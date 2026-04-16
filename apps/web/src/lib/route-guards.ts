/**
 * Universal route-guard helpers for TanStack Router `beforeLoad` hooks.
 *
 * Wraps the pure `checkRouteAccess` matrix with router-aware redirects.
 * Keeping the guard separate from `route-permissions.ts` keeps the permission
 * matrix free of React / TanStack imports and unit-testable in isolation.
 */

import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/auth-store';
import { checkRouteAccess } from './route-permissions';

/**
 * Enforce access to `path` for the currently-authenticated user.
 *
 * Throws a TanStack `redirect` when:
 *   - no user is signed in (→ `/auth/login` with returnTo)
 *   - the signed-in role is not permitted on `path` (→ their tier home)
 *
 * Call from a route's `beforeLoad`:
 * ```tsx
 * beforeLoad: () => guardRoute('/settings'),
 * ```
 */
export function guardRoute(path: string): void {
  const { user } = useAuthStore.getState();

  if (!user) {
    throw redirect({
      // TanStack's route-tree typing is narrow; cast is needed because `path`
      // is a runtime string not a member of the generated route union.
      to: '/auth/login',
      search: { returnTo: path },
    });
  }

  const to = checkRouteAccess(user.role, path);
  if (to !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw redirect({ to: to as any });
  }
}
