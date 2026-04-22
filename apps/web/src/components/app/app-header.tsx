import type { ReactElement } from 'react';
import type { AuthUser } from '@compass/types';
import { ProfileMenu } from './profile-menu';
import { TopTabBar } from '../navigation/top-tab-bar';
import { AppLink } from '../navigation/app-link';
import type { RoleNavConfig } from '../../lib/navigation';

/**
 * App-shell header: clickable logo + brand lockup, primary tab bar (desktop
 * only, rendered when `config.primaryTabs` is non-empty), and the profile
 * menu on the right.
 *
 * Driven entirely by `config` — no tier branching. Parity between tier_1 and
 * tier_2 is established in `getNavConfigForRole()`; this component is
 * role-agnostic.
 */
interface AppHeaderProps {
  user: AuthUser;
  config: RoleNavConfig;
  activeTabId: string | null;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export function AppHeader({
  user,
  config,
  activeTabId,
  onSignOut,
  onNavigate,
}: AppHeaderProps): ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <AppLink to={config.logoHref} className="flex items-center gap-3">
        <img
          src="/compass-brand-panel-dark.svg"
          alt="The Collective Culture Compass"
          className="h-8 w-8"
        />
        <div className="hidden flex-col sm:flex">
          <span
            className="text-sm font-semibold text-[var(--grey-900)]"
            style={{ fontFamily: 'var(--font-headings)' }}
          >
            The Collective Culture Compass&#8482;
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            culture + communication
          </span>
        </div>
      </AppLink>

      {config.primaryTabs.length > 0 && (
        <TopTabBar tabs={config.primaryTabs} activeTabId={activeTabId} />
      )}

      <ProfileMenu
        user={user}
        items={config.profileMenuItems}
        onSignOut={onSignOut}
        onNavigate={onNavigate}
      />
    </div>
  );
}
