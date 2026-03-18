import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { AuthUser } from '@compass/types';
import { UserRole } from '@compass/types';

/**
 * Tests for admin route guard logic (checkTier1Access, checkCccAdminAccess).
 *
 * Guards are pure functions that return a redirect path or null.
 * No @tanstack/react-router mocking needed.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let mockUser: AuthUser | null = null;

mock.module('../../stores/auth-store', () => ({
  useAuthStore: Object.assign(
    () => mockUser,
    { getState: () => ({ user: mockUser }) },
  ),
}));

const { checkTier1Access, checkCccAdminAccess } = await import('./route-guards.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u-1',
    email: 'test@ccc.ca',
    fullName: 'Test User',
    avatarUrl: null,
    role: UserRole.CCC_ADMIN,
    organizationId: null,
    tier: 'tier_1',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('checkTier1Access', () => {
  beforeEach(() => {
    mockUser = null;
  });

  it('returns /dashboard for unauthenticated users', () => {
    mockUser = null;
    expect(checkTier1Access()).toBe('/dashboard');
  });

  it('returns /dashboard for tier_2 users', () => {
    mockUser = makeUser({ role: UserRole.CLIENT_DIRECTOR, tier: 'tier_2' });
    expect(checkTier1Access()).toBe('/dashboard');
  });

  it('returns null for ccc_admin users', () => {
    mockUser = makeUser({ role: UserRole.CCC_ADMIN, tier: 'tier_1' });
    expect(checkTier1Access()).toBeNull();
  });

  it('returns null for ccc_member users', () => {
    mockUser = makeUser({ role: UserRole.CCC_MEMBER, tier: 'tier_1' });
    expect(checkTier1Access()).toBeNull();
  });
});

describe('checkCccAdminAccess', () => {
  beforeEach(() => {
    mockUser = null;
  });

  it('returns null for ccc_admin users', () => {
    mockUser = makeUser({ role: UserRole.CCC_ADMIN, tier: 'tier_1' });
    expect(checkCccAdminAccess()).toBeNull();
  });

  it('returns /admin/clients for ccc_member', () => {
    mockUser = makeUser({ role: UserRole.CCC_MEMBER, tier: 'tier_1' });
    expect(checkCccAdminAccess()).toBe('/admin/clients');
  });

  it('returns /admin/clients for unauthenticated', () => {
    mockUser = null;
    expect(checkCccAdminAccess()).toBe('/admin/clients');
  });
});
