import { describe, test, expect, beforeEach } from 'bun:test';
import type { AuthUser, UserRole as UserRoleType } from '@compass/types';
import { UserRole } from '@compass/types';

/**
 * Tests for `guardRoute` — verifies unauthenticated redirects carry a
 * `returnTo` search param, role-authorised users pass through, and
 * role-forbidden users redirect to their tier home.
 *
 * Parity sweep iterates every entry in `ROUTE_ACCESS` to lock in Flow 9.1:
 * every protected route must round-trip the requested path as `returnTo`
 * so the router can deep-link back after sign-in.
 *
 * No mocks required — `guardRoute` reads the real Zustand auth store, so
 * we drive it directly by `setState`/`clearSession`.
 */

import { useAuthStore } from '../stores/auth-store';
import { guardRoute } from './route-guards';
import { ROUTE_ACCESS, ALL_ROLES } from './route-permissions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(role: UserRoleType, organizationId: string | null = 'org-1'): AuthUser {
  return {
    id: 'user-1',
    email: `${role}@example.com`,
    fullName: 'Test User',
    avatarUrl: null,
    role,
    organizationId,
    tier: role === UserRole.CCC_ADMIN || role === UserRole.CCC_MEMBER ? 'tier_1' : 'tier_2',
  };
}

function setUser(user: AuthUser | null): void {
  if (user === null) {
    useAuthStore.setState({
      session: null,
      user: null,
      isLoading: false,
      error: null,
      isInitialized: true,
    });
  } else {
    useAuthStore.setState({
      session: {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3_600_000,
        user,
      },
      user,
      isLoading: false,
      error: null,
      isInitialized: true,
    });
  }
}

/** Capture whatever `guardRoute` throws; return undefined on clean return. */
function runGuard(path: string): unknown {
  try {
    guardRoute(path);
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}

/** Narrow the thrown redirect Response to its attached `options` payload. */
function redirectOptions(thrown: unknown): { to?: string; search?: { returnTo?: string } } {
  if (thrown === null || typeof thrown !== 'object') {
    throw new Error(`Expected redirect object; got ${typeof thrown}`);
  }
  const opts = (thrown as { options?: unknown }).options;
  if (opts === null || typeof opts !== 'object') {
    throw new Error('Redirect is missing `.options` payload');
  }
  return opts as { to?: string; search?: { returnTo?: string } };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('guardRoute — unauthenticated', () => {
  beforeEach(() => {
    setUser(null);
  });

  test.each([
    '/clients',
    '/dashboard',
    '/results/abc/compass',
    '/settings',
    '/reports/xyz',
    '/users',
  ])('redirects %s to /auth/login with returnTo preserved', (path) => {
    const thrown = runGuard(path);
    expect(thrown).toBeDefined();
    const opts = redirectOptions(thrown);
    expect(opts.to).toBe('/auth/login');
    expect(opts.search?.returnTo).toBe(path);
  });

  // Parity sweep — locks in Flow 9.1: every matrix key round-trips returnTo.
  const matrixPaths = Object.keys(ROUTE_ACCESS);
  test.each(matrixPaths)(
    'parity: %s produces /auth/login?returnTo=<path>',
    (path) => {
      const thrown = runGuard(path);
      const opts = redirectOptions(thrown);
      expect(opts.to).toBe('/auth/login');
      expect(opts.search?.returnTo).toBe(path);
    },
  );
});

describe('guardRoute — authenticated with allowed role', () => {
  test('ccc_admin allowed on /clients — no throw', () => {
    setUser(makeUser(UserRole.CCC_ADMIN));
    expect(runGuard('/clients')).toBeUndefined();
  });

  test('client_exec allowed on /dashboard — no throw', () => {
    setUser(makeUser(UserRole.CLIENT_EXEC));
    expect(runGuard('/dashboard')).toBeUndefined();
  });

  test('client_user allowed on /dashboard — no throw', () => {
    setUser(makeUser(UserRole.CLIENT_USER));
    expect(runGuard('/dashboard')).toBeUndefined();
  });

  test('any role allowed on ALL_ROLES routes (/settings, /help, /profile)', () => {
    for (const role of [
      UserRole.CCC_ADMIN,
      UserRole.CCC_MEMBER,
      UserRole.CLIENT_EXEC,
      UserRole.CLIENT_DIRECTOR,
      UserRole.CLIENT_MANAGER,
      UserRole.CLIENT_USER,
    ] as const) {
      setUser(makeUser(role));
      expect(runGuard('/settings')).toBeUndefined();
      expect(runGuard('/help')).toBeUndefined();
      expect(runGuard('/profile')).toBeUndefined();
    }
  });

  // ALL_ROLES entries exist; sanity-check that iterating the matrix doesn't
  // flag any ALL_ROLES path as forbidden for ccc_admin.
  test('ccc_admin allowed on every ALL_ROLES entry in the matrix', () => {
    setUser(makeUser(UserRole.CCC_ADMIN));
    for (const [path, access] of Object.entries(ROUTE_ACCESS)) {
      if (access === ALL_ROLES) {
        expect(runGuard(path)).toBeUndefined();
      }
    }
  });
});

describe('guardRoute — authenticated with disallowed role', () => {
  test('client_exec → /clients redirects to tier_2 home /dashboard', () => {
    setUser(makeUser(UserRole.CLIENT_EXEC));
    const thrown = runGuard('/clients');
    const opts = redirectOptions(thrown);
    expect(opts.to).toBe('/dashboard');
    // No returnTo for role-denied redirects — the caller's original path
    // is inappropriate for their role, so we send them home cleanly.
    expect(opts.search?.returnTo).toBeUndefined();
  });

  test('ccc_admin → /dashboard redirects to tier_1 home /clients', () => {
    setUser(makeUser(UserRole.CCC_ADMIN));
    const thrown = runGuard('/dashboard');
    const opts = redirectOptions(thrown);
    expect(opts.to).toBe('/clients');
  });

  test('client_user → /results redirects to /dashboard (tier_2 home)', () => {
    setUser(makeUser(UserRole.CLIENT_USER));
    const thrown = runGuard('/results/abc/compass');
    const opts = redirectOptions(thrown);
    expect(opts.to).toBe('/dashboard');
  });

  test('ccc_member → /users redirects to /clients (tier_1 home)', () => {
    setUser(makeUser(UserRole.CCC_MEMBER));
    const thrown = runGuard('/users');
    const opts = redirectOptions(thrown);
    expect(opts.to).toBe('/clients');
  });
});
