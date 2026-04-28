/**
 * Canonical route-access matrix for the authenticated app.
 *
 * Every protected route is listed here with the set of roles that may access it.
 * Routes not listed here are treated as public (or unknown — the router handles 404).
 *
 * Why this lives in one file: the permission matrix is the single source of truth
 * for route guards, nav-config destinations, E2E parity tests, and tier-home
 * redirects. Collocating them here prevents drift between components, guards,
 * and tests.
 */

import { type UserRole, UserRole as Roles, getTierFromRole } from '@compass/types';

/** Sentinel for "any authenticated role." */
export const ALL_ROLES = 'ALL' as const;
export type AllRoles = typeof ALL_ROLES;

export type RouteAccess = readonly UserRole[] | AllRoles;

/**
 * Access matrix — keyed by route path. Longest-prefix match is used by
 * {@link checkRouteAccess} so child paths inherit parent access.
 */
export const ROUTE_ACCESS: Readonly<Record<string, RouteAccess>> = {
  // Tier 1 — CC+C team
  '/clients':          [Roles.CCC_ADMIN, Roles.CCC_MEMBER],
  '/users':            [Roles.CCC_ADMIN],
  '/surveys':          [Roles.CCC_ADMIN, Roles.CCC_MEMBER],
  '/recommendations':  [Roles.CCC_ADMIN],
  '/email-log':        [Roles.CCC_ADMIN],
  '/email-templates':  [Roles.CCC_ADMIN, Roles.CCC_MEMBER],
  // /insights route removed 2026-04-20 — feature not yet built; re-add to access matrix + create route when shipping.

  // Tier 2 — client dashboard (tier 1 have their own /clients home)
  '/dashboard': [
    Roles.CLIENT_EXEC,
    Roles.CLIENT_DIRECTOR,
    Roles.CLIENT_MANAGER,
    Roles.CLIENT_USER,
  ],

  // Results + reports: tier 1 (CC+C team) can view client data to support
  // engagements; tier 2 viewers below client_user. The per-route bespoke
  // guards in /results and /reports apply the additional organizations.
  // client_access_enabled check for tier_2.
  '/results': [
    Roles.CCC_ADMIN,
    Roles.CCC_MEMBER,
    Roles.CLIENT_EXEC,
    Roles.CLIENT_DIRECTOR,
    Roles.CLIENT_MANAGER,
  ],
  '/reports': [
    Roles.CCC_ADMIN,
    Roles.CCC_MEMBER,
    Roles.CLIENT_EXEC,
    Roles.CLIENT_DIRECTOR,
    Roles.CLIENT_MANAGER,
  ],

  // All authenticated roles — tier-aware content lives inside the page
  '/settings': ALL_ROLES,
  '/help':     ALL_ROLES,
  '/profile':  ALL_ROLES,
} as const;

/**
 * Return the tier-home route for a given role. Used as the logo destination
 * and as the redirect target when a role hits a forbidden route.
 */
export function getHomeForRole(role: UserRole): string {
  return getTierFromRole(role) === 'tier_1' ? '/clients' : '/dashboard';
}

/**
 * Given a role and a target path, returns:
 *   - `undefined` if the role is allowed to view the target path
 *   - the redirect path (the role's tier home) if access is denied
 *
 * Uses longest-prefix match so `/results/archetypes` resolves to the `/results`
 * entry. Returns `undefined` for unknown routes — let the router surface a 404.
 *
 * @example
 *   checkRouteAccess('client_exec', '/dashboard')       // undefined (allowed)
 *   checkRouteAccess('client_exec', '/clients')         // '/dashboard'   (redirect)
 *   checkRouteAccess('ccc_admin',   '/dashboard')       // '/clients'     (redirect)
 *   checkRouteAccess('ccc_admin',   '/settings/theme')  // undefined (/settings is ALL_ROLES)
 */
export function checkRouteAccess(
  role: UserRole,
  targetPath: string,
): string | undefined {
  const matched = Object.keys(ROUTE_ACCESS)
    .filter((p) => targetPath === p || targetPath.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (matched === undefined) return undefined; // unknown route — let router 404

  const allowed = ROUTE_ACCESS[matched];
  if (allowed === undefined) return undefined; // unreachable given the filter, but narrows the type
  if (allowed === ALL_ROLES) return undefined;
  if (allowed.includes(role)) return undefined;

  const home = getHomeForRole(role);
  // Safety: if the home itself resolves to forbidden, don't loop — return undefined.
  return targetPath === home ? undefined : home;
}
