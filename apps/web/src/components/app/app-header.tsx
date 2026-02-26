import type { ReactElement } from 'react';
import type { AuthUser } from '@compass/types';
import { getTierFromRole } from '@compass/types';
import { CompassLogo } from '../brand/compass-logo';
import { ProfileMenu } from './profile-menu';
import { ThemeToggle } from './theme-toggle';
import { TopTabBar } from '../navigation/top-tab-bar';
import type { TabConfig } from '../../lib/navigation';

interface AppHeaderProps {
  user: AuthUser;
  tabs: TabConfig[];
  activeTabId: string | null;
  onSignOut: () => void;
}

export function AppHeader({ user, tabs, activeTabId, onSignOut }: AppHeaderProps): ReactElement {
  const tier = getTierFromRole(user.role);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <CompassLogo size="sm" />
        <span
          className="hidden text-sm font-semibold text-[var(--grey-900)] sm:inline"
          style={{ fontFamily: 'var(--font-headings)' }}
        >
          Culture Compass
        </span>
      </div>

      <TopTabBar tabs={tabs} activeTabId={activeTabId} />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <ProfileMenu user={user} tier={tier} onSignOut={onSignOut} />
      </div>
    </div>
  );
}
