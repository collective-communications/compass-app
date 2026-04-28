/**
 * Route-permission parity test.
 *
 * Fails CI when `ROUTE_ACCESS` and the TanStack Router registrations drift:
 *   - every matrix key must have a matching registered route
 *   - every registered protected route must appear in the matrix
 *
 * Public routes (`/`, `/auth/*`, `/s/*`) are handled by dedicated route guards
 * and are deliberately excluded from the access matrix.
 *
 * ## Why a hardcoded list instead of walking the tree
 *
 * The full TanStack route tree (`apps/web/src/routes/__root.tsx`) pulls in
 * React, the app shells, and a pile of lazy-loaded pages. Importing it from
 * bun:test land drags in the DOM + real Supabase client + auth store and makes
 * the test a mini-integration harness rather than a cheap parity check.
 *
 * The list below mirrors the path strings that the feature route modules pass
 * to `createRoute({ path })`. Extracted from:
 *   - apps/web/src/routes/__root.tsx               (`/`, `*` not-found)
 *   - apps/web/src/features/admin/routes.tsx       (`/clients`, `/clients/$orgId`, `/clients/$orgId/settings`, `/surveys/$surveyId`, `/surveys/$surveyId/publish`, `/users`, `/recommendations`, `/email-log`, `/email-templates`)
 *   - apps/web/src/features/dashboard/routes.tsx   (`/dashboard`)
 *   - apps/web/src/features/results/routes.tsx     (`/results/$surveyId/*`)
 *   - apps/web/src/features/reports/routes.tsx     (`/reports/$surveyId`)
 *   - apps/web/src/features/settings/routes.tsx    (`/settings`)
 *   - apps/web/src/features/help/routes.tsx        (`/help`)
 *   - apps/web/src/features/profile/routes.tsx     (`/profile`)
 *   - apps/web/src/features/auth/routes.tsx        (`/auth/*`)
 *   - apps/web/src/features/survey/routes.tsx      (`/s/*`)
 *
 * **Keep this list in sync with the route registrations.** If you add a new
 * protected top-level route, add it here AND to `ROUTE_ACCESS`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, test } from 'bun:test';
import { ROUTE_ACCESS } from './route-permissions';

/**
 * All registered top-level path *prefixes* in the router. Parameter segments
 * (`$orgId`, `$surveyId`, `$token`) are included verbatim — parity matches by
 * prefix so `/results` in the matrix resolves against `/results/$surveyId`.
 */
const REGISTERED_ROUTES = [
  // Root
  '/',

  // Auth (public — excluded from matrix)
  '/auth/login',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/forgot-password/sent',
  '/auth/accept-invite',

  // Survey engine (public — excluded from matrix)
  '/s/$token',
  '/s/$token/q/$index',
  '/s/$token/open',
  '/s/$token/complete',
  '/s/$token/saved',

  // Admin — /clients family
  '/clients',
  '/clients/$orgId',
  '/clients/$orgId/overview',
  '/clients/$orgId/surveys',
  '/clients/$orgId/users',
  '/clients/$orgId/settings',

  // Admin — /surveys family
  '/surveys/$surveyId',
  '/surveys/$surveyId/publish',

  // Admin — /users
  '/users',

  // Admin — /recommendations
  '/recommendations',

  // Admin — /email-log
  '/email-log',

  // Admin — /email-templates
  '/email-templates',

  // Client dashboard
  '/dashboard',

  // Results (nested under /results/$surveyId)
  '/results/$surveyId',
  '/results/$surveyId/compass',
  '/results/$surveyId/survey',
  '/results/$surveyId/groups',
  '/results/$surveyId/dialogue',
  '/results/$surveyId/reports',
  '/results/$surveyId/recommendations',

  // Reports
  '/reports/$surveyId',

  // Shared tier-aware
  '/settings',
  '/help',
  '/profile',
] as const;

/**
 * Paths deliberately not in `ROUTE_ACCESS`. They are either public (no auth
 * required), surveys with their own token-based access model, or the root
 * landing page.
 */
const PUBLIC_ROUTE_PREFIXES = ['/', '/auth', '/s'] as const;

/**
 * Return true if `registered` starts with `matrixKey` (or is equal), so
 * `/results` in the matrix matches `/results/$surveyId`.
 */
function registeredMatchesMatrixKey(registered: string, matrixKey: string): boolean {
  return registered === matrixKey || registered.startsWith(`${matrixKey}/`);
}

/**
 * Return true if a path should be skipped from the matrix-side parity check —
 * public landing, /auth/*, /s/*.
 */
function isPublicRoute(path: string): boolean {
  if (path === '/') return true;
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => prefix !== '/' && (path === prefix || path.startsWith(`${prefix}/`)),
  );
}

describe('route-permission parity', () => {
  it('every ROUTE_ACCESS key has a matching registered route', () => {
    const drift: string[] = [];
    for (const matrixKey of Object.keys(ROUTE_ACCESS)) {
      const hit = REGISTERED_ROUTES.some((registered) =>
        registeredMatchesMatrixKey(registered, matrixKey),
      );
      if (!hit) drift.push(matrixKey);
    }
    expect(
      drift,
      `ROUTE_ACCESS keys with no registered TanStack route: ${drift.join(', ')}`,
    ).toEqual([]);
  });

  it('every registered protected route has a matching ROUTE_ACCESS entry', () => {
    const matrixKeys = Object.keys(ROUTE_ACCESS);
    const drift: string[] = [];

    for (const registered of REGISTERED_ROUTES) {
      if (isPublicRoute(registered)) continue;

      const hit = matrixKeys.some((matrixKey) =>
        registeredMatchesMatrixKey(registered, matrixKey),
      );
      if (!hit) drift.push(registered);
    }

    expect(
      drift,
      `Registered protected routes missing from ROUTE_ACCESS: ${drift.join(', ')}`,
    ).toEqual([]);
  });
});

/**
 * guardRoute() drift guard — ensures parameterised routes always pass the
 * full `location.pathname` through so `returnTo` captures the real URL.
 *
 * Wave 1 shipped with bespoke `throw redirect({ to: '/auth/login' })` calls
 * that dropped `returnTo`; the follow-up swapped them for `guardRoute(...)`.
 * This test catches a different variant of the same bug: `guardRoute('/reports')`
 * on a `/reports/$surveyId` route drops the `$surveyId` from `returnTo`.
 *
 * Per-route rules:
 *   1. `guardRoute(location.pathname)` — always OK (preferred for parameterised).
 *   2. `guardRoute('literal')` on a parameterised route — drift (path params lost).
 *   3. `guardRoute('literal')` on a root-only route — must equal the route's own
 *      `path` literal (otherwise the returnTo will be wrong).
 *
 * Manual verification: temporarily revert
 * `apps/web/src/features/reports/routes.tsx` line ~63 from
 * `guardRoute(location.pathname)` to `guardRoute('/reports')` and re-run this
 * file — the test should report the drift.
 */
const GUARD_FILES = [
  'apps/web/src/features/results/routes.tsx',
  'apps/web/src/features/reports/routes.tsx',
  'apps/web/src/features/admin/routes.tsx',
  'apps/web/src/features/dashboard/routes.tsx',
  'apps/web/src/features/help/routes.tsx',
  'apps/web/src/features/profile/routes.tsx',
  'apps/web/src/features/settings/routes.tsx',
];

test('guardRoute on parameterised routes must use location.pathname', () => {
  const drift: string[] = [];

  for (const rel of GUARD_FILES) {
    let src: string;
    try {
      src = readFileSync(resolve(process.cwd(), rel), 'utf-8');
    } catch {
      continue; // file doesn't exist in this feature — skip
    }

    const chunks = src.split('createRoute(');
    for (let i = 1; i < chunks.length; i++) {
      const body = chunks[i];
      const pathMatch = body.match(/path:\s*['"`]([^'"`]+)['"`]/);
      if (!pathMatch) continue;
      const routePath = pathMatch[1];
      const isParameterised = routePath.includes('$');

      const guardCalls = body.match(/guardRoute\([^)]+\)/g) ?? [];
      for (const call of guardCalls) {
        const usesHardcoded = /guardRoute\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(call);
        if (!usesHardcoded) continue; // template or location.pathname — OK

        const hardcodedPath = usesHardcoded[1];

        if (isParameterised) {
          drift.push(
            `${rel}: parameterised route "${routePath}" uses ${call} — should be guardRoute(location.pathname)`,
          );
        } else if (hardcodedPath !== routePath) {
          drift.push(
            `${rel}: route "${routePath}" uses guardRoute("${hardcodedPath}") — path mismatch`,
          );
        }
      }
    }
  }

  expect(drift, `guardRoute drift:\n  ${drift.join('\n  ')}`).toEqual([]);
});
