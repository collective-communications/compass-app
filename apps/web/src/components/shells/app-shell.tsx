import type { ReactElement, ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useRequireAuth } from '../../hooks/use-require-auth';
import { useAppNavigate } from '../../hooks/use-app-navigate';
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
  const navigate = useAppNavigate();

  const handleNavigate = (path: string): void => {
    void navigate({ to: path });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]" role="status">Loading...</p>
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
          onNavigate={handleNavigate}
        />
      }
      footer={tabs.length > 0 ? <BottomTabBar tabs={tabs} activeTabId={activeTabId} /> : undefined}
    >
      <div className={tabs.length > 0 ? 'pb-16 lg:pb-0' : ''}>{children}</div>
    </BaseLayout>
  );
}
