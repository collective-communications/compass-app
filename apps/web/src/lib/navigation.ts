/**
 * Role-aware navigation configuration.
 *
 * One `RoleNavConfig` per tier drives the app shell: primary tabs (bottom/top
 * bar), the clickable logo's destination, and the profile-menu items. The
 * `SHARED_PROFILE_ITEMS` constant is deliberately singular — any item added
 * there lands on every tier automatically, which is the parity guarantee that
 * prevents the "admin gets Settings, exec doesn't" drift we're fixing here.
 */

import { type UserRole, type UserTier, getTierFromRole } from '@compass/types';
import type { IconId } from './icons';
import { getHomeForRole } from './route-permissions';

/** A primary-tab entry rendered in `BottomTabBar` / `TopTabBar`. */
export interface TabConfig {
  id: string;
  label: string;
  icon: IconId | string;
  href: string;
  disabled?: boolean;
}

/**
 * Behaviour hook for menu items that don't simply navigate.
 * - `signOut`      — calls the auth store's sign-out
 * - `toggleTheme`  — flips the local theme state
 */
export type ProfileMenuAction = 'signOut' | 'toggleTheme';

/** A single item in the profile dropdown menu. */
export interface ProfileMenuItem {
  id: string;
  label: string;
  icon: IconId | string;
  /** Navigation destination. Omit when `action` is set. */
  href?: string;
  /** Side-effect hook instead of a navigation link. */
  action?: ProfileMenuAction;
}

/** Complete nav configuration for a tier. */
export interface RoleNavConfig {
  /** Main navigation tabs (empty = no tab bar rendered). */
  primaryTabs: TabConfig[];
  /** Destination the clickable logo navigates to. */
  logoHref: string;
  /** Ordered profile-menu items. */
  profileMenuItems: ProfileMenuItem[];
}

// ─── Shared config fragments ────────────────────────────────────────────────

/**
 * Profile-menu items common to every tier. This is the parity guarantee —
 * every role sees Profile, Help, Settings, Theme, and Sign out in the same
 * order. Tier-specific behaviour is handled inside each destination page, not
 * by gating menu items.
 */
const SHARED_PROFILE_ITEMS: readonly ProfileMenuItem[] = [
  { id: 'profile',  label: 'Profile',  icon: 'user',        href: '/profile' },
  { id: 'help',     label: 'Help',     icon: 'help-circle', href: '/help' },
  { id: 'settings', label: 'Settings', icon: 'settings',    href: '/settings' },
  { id: 'theme',    label: 'Theme',    icon: 'sun-moon',    action: 'toggleTheme' },
  { id: 'signout',  label: 'Sign out', icon: 'log-out',     action: 'signOut' },
] as const;

// ─── Per-tier configurations ────────────────────────────────────────────────

const TIER_1_CONFIG: RoleNavConfig = {
  primaryTabs: [],
  logoHref: '/clients',
  profileMenuItems: [...SHARED_PROFILE_ITEMS],
};

const TIER_2_CONFIG: RoleNavConfig = {
  primaryTabs: [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
    { id: 'results',   label: 'Results',   icon: 'compass',     href: '/results' },
    { id: 'reports',   label: 'Reports',   icon: 'file-down',   href: '/reports' },
  ],
  logoHref: '/dashboard',
  profileMenuItems: [...SHARED_PROFILE_ITEMS],
};

const NAV_CONFIG: Readonly<Record<UserTier, RoleNavConfig>> = {
  tier_1: TIER_1_CONFIG,
  tier_2: TIER_2_CONFIG,
};

// ─── Public accessors ───────────────────────────────────────────────────────

/** Return the complete nav configuration for a role. */
export function getNavConfigForRole(role: UserRole): RoleNavConfig {
  return NAV_CONFIG[getTierFromRole(role)];
}

// Re-export for callers that need the home path without importing permissions.
export { getHomeForRole };
