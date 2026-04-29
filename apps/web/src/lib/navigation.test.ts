import { describe, it, expect } from 'bun:test';
import { UserRole, type UserRole as UserRoleType } from '@compass/types';
import {
  getNavConfigForRole,
  getHomeForRole,
  type ProfileMenuItem,
} from './navigation';
import { ICON_MAP } from './icons';

const ALL_USER_ROLES: readonly UserRoleType[] = [
  UserRole.CCC_ADMIN,
  UserRole.CCC_MEMBER,
  UserRole.CLIENT_EXEC,
  UserRole.CLIENT_DIRECTOR,
  UserRole.CLIENT_MANAGER,
  UserRole.CLIENT_USER,
];

const REQUIRED_MENU_IDS = ['profile', 'help', 'settings', 'theme', 'signout'] as const;

// ─── Parity guarantee ───────────────────────────────────────────────────────

describe('profile-menu parity', () => {
  it.each(ALL_USER_ROLES)('%s has every required menu item', (role) => {
    const config = getNavConfigForRole(role);
    const ids = new Set(config.profileMenuItems.map((i) => i.id));
    for (const required of REQUIRED_MENU_IDS) {
      expect(ids.has(required)).toBe(true);
    }
  });

  it('all roles share the exact same profile-menu item list (order-sensitive)', () => {
    const reference = getNavConfigForRole(UserRole.CCC_ADMIN).profileMenuItems;
    for (const role of ALL_USER_ROLES) {
      const items = getNavConfigForRole(role).profileMenuItems;
      expect(items).toEqual(reference);
    }
  });
});

// ─── Logo destination matches home ──────────────────────────────────────────

describe('logoHref matches getHomeForRole', () => {
  it.each(ALL_USER_ROLES)('%s logoHref equals its home route', (role) => {
    const config = getNavConfigForRole(role);
    expect(config.logoHref).toBe(getHomeForRole(role));
  });
});

// ─── Primary tabs — per tier ────────────────────────────────────────────────

describe('primaryTabs per tier', () => {
  it('tier_1 roles have clients, analytics, settings', () => {
    for (const role of [UserRole.CCC_ADMIN, UserRole.CCC_MEMBER]) {
      const ids = getNavConfigForRole(role).primaryTabs.map((t) => t.id);
      expect(ids).toEqual(['clients', 'analytics', 'settings']);
    }
  });

  it('tier_2 roles have dashboard, results, reports', () => {
    for (const role of [
      UserRole.CLIENT_EXEC,
      UserRole.CLIENT_DIRECTOR,
      UserRole.CLIENT_MANAGER,
      UserRole.CLIENT_USER,
    ]) {
      const ids = getNavConfigForRole(role).primaryTabs.map((t) => t.id);
      expect(ids).toEqual(['dashboard', 'results', 'reports']);
    }
  });
});

// ─── Icon references are resolvable ─────────────────────────────────────────

describe('icon references', () => {
  it.each(ALL_USER_ROLES)('%s — every icon id resolves to an ICON_MAP entry', (role) => {
    const config = getNavConfigForRole(role);
    const allIcons: string[] = [
      ...config.primaryTabs.map((t) => t.icon),
      ...config.profileMenuItems.map((i) => i.icon),
    ];
    for (const id of allIcons) {
      expect(ICON_MAP[id]).toBeDefined();
    }
  });
});

// ─── Menu-item action/href invariant ────────────────────────────────────────

describe('menu-item invariants', () => {
  it('every menu item has either href or action, never both, never neither', () => {
    for (const role of ALL_USER_ROLES) {
      const items = getNavConfigForRole(role).profileMenuItems;
      for (const item of items) {
        const hasHref = typeof item.href === 'string';
        const hasAction = typeof item.action === 'string';
        expect(hasHref !== hasAction).toBe(true);
      }
    }
  });

  it('sign-out and theme items use the expected actions', () => {
    const items = getNavConfigForRole(UserRole.CCC_ADMIN).profileMenuItems;
    const byId = Object.fromEntries(items.map((i): [string, ProfileMenuItem] => [i.id, i]));
    expect(byId.signout?.action).toBe('signOut');
    expect(byId.theme?.action).toBe('toggleTheme');
  });
});
