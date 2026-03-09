import { type UserRole, getTierFromRole } from '@compass/types';

export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  href: string;
  disabled?: boolean;
}

const ADMIN_TABS: TabConfig[] = [
  { id: 'clients', label: 'Clients', icon: 'building', href: '/admin/clients' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings' },
];

const CLIENT_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', href: '/dashboard' },
  { id: 'results', label: 'Results', icon: 'compass', href: '/results' },
  { id: 'reports', label: 'Reports', icon: 'file-down', href: '/reports' },
];

export function getTabsForRole(role: UserRole): TabConfig[] {
  const tier = getTierFromRole(role);
  return tier === 'tier_1' ? ADMIN_TABS : CLIENT_TABS;
}
