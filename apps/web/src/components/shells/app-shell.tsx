import type { ReactElement, ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useRequireAuth } from '../../features/auth/hooks/use-require-auth';
import { getTabsForRole } from '../../lib/navigation';
import { BaseLayout } from './base-layout';
import { AppHeader } from '../app/app-header';
import { BottomTabBar } from '../navigation/bottom-tab-bar';

interface AppShellProps {
  children: ReactNode;
}

function getActiveTabId(tabs: { id: string; href: string }[], pathname: string): string | null {
  for (const tab of tabs) {
    if (pathname.startsWith(tab.href)) return tab.id;
  }
  return null;
}

export function AppShell({ children }: AppShellProps): ReactElement {
  const user = useRequireAuth();
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--grey-500)]">Loading...</p>
      </div>
    );
  }

  const tabs = getTabsForRole(user.role);
  const activeTabId = getActiveTabId(tabs, window.location.pathname);

  return (
    <BaseLayout
      header={
        <AppHeader
          user={user}
          tabs={tabs}
          activeTabId={activeTabId}
          onSignOut={signOut}
        />
      }
      footer={<BottomTabBar tabs={tabs} activeTabId={activeTabId} />}
    >
      <div className="pb-16 lg:pb-0">{children}</div>
    </BaseLayout>
  );
}
