import type { ReactElement } from 'react';
import type { AuthUser } from '@compass/types';
import { getTierFromRole } from '@compass/types';
import { CompassLogo } from '../brand/compass-logo';
import { ProfileMenu } from './profile-menu';
import { TopTabBar } from '../navigation/top-tab-bar';
import { AppLink } from '../navigation/app-link';
import type { TabConfig } from '../../lib/navigation';

interface AppHeaderProps {
  user: AuthUser;
  tabs: TabConfig[];
  activeTabId: string | null;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export function AppHeader({ user, tabs, activeTabId, onSignOut, onNavigate }: AppHeaderProps): ReactElement {
  const tier = getTierFromRole(user.role);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {tier === 'tier_1' ? (
        <AppLink to="/admin/clients" className="flex items-center gap-3">
          <CompassLogo size="sm" />
          <span
            className="hidden text-sm font-semibold text-[var(--grey-900)] sm:inline"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            Culture Compass
          </span>
        </AppLink>
      ) : (
        <div className="flex items-center gap-3">
          <CompassLogo size="sm" />
          <span
            className="hidden text-sm font-semibold text-[var(--grey-900)] sm:inline"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            Culture Compass
          </span>
        </div>
      )}

      {tabs.length > 0 && <TopTabBar tabs={tabs} activeTabId={activeTabId} />}

      <ProfileMenu user={user} tier={tier} onSignOut={onSignOut} onNavigate={onNavigate} />
    </div>
  );
}
