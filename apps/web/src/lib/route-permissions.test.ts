import { describe, it, expect } from 'bun:test';
import { UserRole, type UserRole as UserRoleType } from '@compass/types';
import {
  ALL_ROLES,
  ROUTE_ACCESS,
  checkRouteAccess,
  getHomeForRole,
} from './route-permissions';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ALL_USER_ROLES: readonly UserRoleType[] = [
  UserRole.CCC_ADMIN,
  UserRole.CCC_MEMBER,
  UserRole.CLIENT_EXEC,
  UserRole.CLIENT_DIRECTOR,
  UserRole.CLIENT_MANAGER,
  UserRole.CLIENT_USER,
];

const TIER_1_ROLES = [UserRole.CCC_ADMIN, UserRole.CCC_MEMBER] as const;
const TIER_2_ROLES = [
  UserRole.CLIENT_EXEC,
  UserRole.CLIENT_DIRECTOR,
  UserRole.CLIENT_MANAGER,
  UserRole.CLIENT_USER,
] as const;

// ─── getHomeForRole ─────────────────────────────────────────────────────────

describe('getHomeForRole', () => {
  it.each(TIER_1_ROLES)('%s → /clients', (role) => {
    expect(getHomeForRole(role)).toBe('/clients');
  });

  it.each(TIER_2_ROLES)('%s → /dashboard', (role) => {
    expect(getHomeForRole(role)).toBe('/dashboard');
  });
});

// ─── checkRouteAccess — per-tier coverage ───────────────────────────────────

describe('checkRouteAccess (tier 1 admin/member)', () => {
  it.each(['/clients', '/surveys', '/insights'])('ccc_admin allowed on %s', (path) => {
    expect(checkRouteAccess(UserRole.CCC_ADMIN, path)).toBeUndefined();
  });

  it('ccc_admin allowed on /users', () => {
    expect(checkRouteAccess(UserRole.CCC_ADMIN, '/users')).toBeUndefined();
  });

  it('ccc_member denied on /users → redirects to /clients', () => {
    expect(checkRouteAccess(UserRole.CCC_MEMBER, '/users')).toBe('/clients');
  });

  it('ccc_admin denied on /dashboard → /clients', () => {
    expect(checkRouteAccess(UserRole.CCC_ADMIN, '/dashboard')).toBe('/clients');
  });

  it.each(['/results', '/results/abc123/compass', '/reports', '/reports/abc123'])(
    'ccc_admin allowed on %s (CC+C team can view client data)',
    (path) => {
      expect(checkRouteAccess(UserRole.CCC_ADMIN, path)).toBeUndefined();
    },
  );
});

describe('checkRouteAccess (tier 2 client)', () => {
  it('client_exec allowed on /dashboard, /results, /reports', () => {
    expect(checkRouteAccess(UserRole.CLIENT_EXEC, '/dashboard')).toBeUndefined();
    expect(checkRouteAccess(UserRole.CLIENT_EXEC, '/results')).toBeUndefined();
    expect(checkRouteAccess(UserRole.CLIENT_EXEC, '/reports')).toBeUndefined();
  });

  it('client_user allowed on /dashboard only', () => {
    expect(checkRouteAccess(UserRole.CLIENT_USER, '/dashboard')).toBeUndefined();
    expect(checkRouteAccess(UserRole.CLIENT_USER, '/results')).toBe('/dashboard');
    expect(checkRouteAccess(UserRole.CLIENT_USER, '/reports')).toBe('/dashboard');
  });

  it.each(['/clients', '/users', '/surveys', '/insights'])(
    'client_director denied on %s → /dashboard',
    (path) => {
      expect(checkRouteAccess(UserRole.CLIENT_DIRECTOR, path)).toBe('/dashboard');
    },
  );
});

// ─── Universal ALL_ROLES routes ─────────────────────────────────────────────

describe('checkRouteAccess — ALL_ROLES routes', () => {
  it.each(['/settings', '/help', '/profile'])('every role allowed on %s', (path) => {
    for (const role of ALL_USER_ROLES) {
      expect(checkRouteAccess(role, path)).toBeUndefined();
    }
  });

  it.each(['/settings/theme', '/help/articles/123', '/profile/edit'])(
    'deep sub-paths of ALL_ROLES routes are allowed: %s',
    (path) => {
      for (const role of ALL_USER_ROLES) {
        expect(checkRouteAccess(role, path)).toBeUndefined();
      }
    },
  );
});

// ─── Longest-prefix match ───────────────────────────────────────────────────

describe('checkRouteAccess — longest-prefix match', () => {
  it('/results/archetypes resolves to /results rule', () => {
    // client_user is blocked on /results → should also be blocked on children
    expect(checkRouteAccess(UserRole.CLIENT_USER, '/results/archetypes')).toBe('/dashboard');
  });

  it('/clients/123/settings resolves to /clients rule', () => {
    expect(checkRouteAccess(UserRole.CCC_ADMIN, '/clients/123/settings')).toBeUndefined();
    expect(checkRouteAccess(UserRole.CLIENT_EXEC, '/clients/123/settings')).toBe('/dashboard');
  });

  it('unknown routes return undefined (router handles 404)', () => {
    expect(checkRouteAccess(UserRole.CCC_ADMIN, '/no-such-route')).toBeUndefined();
    expect(checkRouteAccess(UserRole.CLIENT_USER, '/admin/clients')).toBeUndefined();
  });
});

// ─── Invariants ─────────────────────────────────────────────────────────────

describe('invariants', () => {
  it('every role is allowed on its own home route (no redirect loops)', () => {
    for (const role of ALL_USER_ROLES) {
      const home = getHomeForRole(role);
      expect(checkRouteAccess(role, home)).toBeUndefined();
    }
  });

  it('ROUTE_ACCESS entries are either ALL_ROLES or non-empty arrays', () => {
    for (const [path, access] of Object.entries(ROUTE_ACCESS)) {
      if (access === ALL_ROLES) continue;
      expect(access.length).toBeGreaterThan(0);
      // No duplicates within a route
      expect(new Set(access).size).toBe(access.length);
      // Sanity: path is rooted
      expect(path.startsWith('/')).toBe(true);
    }
  });
});
