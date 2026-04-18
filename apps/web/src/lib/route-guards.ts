/**
 * Universal route-guard helpers for TanStack Router `beforeLoad` hooks.
 *
 * Wraps the pure `checkRouteAccess` matrix with router-aware redirects.
 * Keeping the guard separate from `route-permissions.ts` keeps the permission
 * matrix free of React / TanStack imports and unit-testable in isolation.
 */

import { redirect, type LinkProps } from '@tanstack/react-router';
import { useAuthStore } from '../stores/auth-store';
import { checkRouteAccess } from './route-permissions';
import { supabase } from './supabase';
import { logger } from './logger';

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
    // `checkRouteAccess` returns a role-home path drawn from route-permissions;
    // TanStack's generated `to` union is narrower than the runtime surface, so
    // we widen through `LinkProps['to']` instead of `any` to keep error shape.
    throw redirect({ to: to as LinkProps['to'] });
  }
}

/**
 * Fetch the `client_access_enabled` flag for an organization.
 *
 * Reads from `organization_settings` — the canonical source written by the
 * admin UI (`features/admin/clients/hooks/use-org-settings.ts`). The legacy
 * `organizations.client_access_enabled` column from migration 017 is never
 * updated by the app and is treated as deprecated.
 *
 * Safety posture: any error shape (row not found, query error, malformed
 * response) is treated as access-disabled. Callers should redirect the user
 * rather than proceeding on ambiguous data.
 *
 * @param organizationId - The org UUID to look up.
 * @returns `true` iff the row exists and `client_access_enabled` is `true`.
 */
async function fetchClientAccessEnabled(organizationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('client_access_enabled')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    logger.warn(
      { err: error, organizationId },
      'guardClientAccess: failed to read organization_settings; treating as access-disabled',
    );
    return false;
  }

  if (!data) {
    // Row missing — fail closed.
    return false;
  }

  return data.client_access_enabled === true;
}

/**
 * Redirects to `/dashboard` when the caller's organization has
 * `client_access_enabled=false` in `organization_settings`.
 *
 * Intended for `beforeLoad` hooks on routes that show scored/reporting
 * content to tier_2 client users. Tier_1 (CC+C admin) callers should be
 * filtered out by the caller before invoking this helper — see
 * `features/results/routes.tsx` and `features/reports/routes.tsx`.
 *
 * Idempotent; safe to call from route `beforeLoad` hooks. Returns void on
 * success; throws a TanStack `redirect` on failure.
 *
 * @param user - The authenticated user carrying an `organizationId`.
 *   Callers must have already null-checked `user` itself.
 * @throws Redirect to `/dashboard` if access is disabled or cannot be
 *   verified, and to `/auth/login` if the user has no organization.
 */
export async function guardClientAccess(user: {
  organizationId: string | null;
}): Promise<void> {
  if (!user.organizationId) {
    // No organization → cannot verify access; send back to dashboard.
    throw redirect({ to: '/dashboard' });
  }

  const enabled = await fetchClientAccessEnabled(user.organizationId);
  if (!enabled) {
    throw redirect({ to: '/dashboard' });
  }
}

/**
 * Shared fetcher for the `useClientAccess` React Query hook. Exposed so the
 * route guard and the UI hook resolve from exactly the same source. Returns
 * `false` on any error shape — see `fetchClientAccessEnabled`.
 *
 * @param organizationId - Non-null org UUID.
 */
export async function queryClientAccessEnabled(organizationId: string): Promise<boolean> {
  return fetchClientAccessEnabled(organizationId);
}
