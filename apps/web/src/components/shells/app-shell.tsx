import type { ReactElement, ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useRequireAuth } from '../../hooks/use-require-auth';
import { useAppNavigate } from '../../hooks/use-app-navigate';
import { getNavConfigForRole } from '../../lib/navigation';
import { BaseLayout } from './base-layout';
import { AppHeader } from '../app/app-header';
import { BottomTabBar } from '../navigation/bottom-tab-bar';

interface AppShellProps {
  children: ReactNode;
}

function getActiveTabId(
  tabs: readonly { id: string; href: string }[],
  pathname: string,
): string | null {
  for (const tab of tabs) {
    if (pathname === tab.href || pathname.startsWith(`${tab.href}/`)) return tab.id;
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
        <p className="text-[var(--text-secondary)]" role="status">
          Loading...
        </p>
      </div>
    );
  }

  const config = getNavConfigForRole(user.role);
  const hasTabs = config.primaryTabs.length > 0;
  const activeTabId = getActiveTabId(config.primaryTabs, window.location.pathname);

  return (
    <BaseLayout
      header={
        <AppHeader
          user={user}
          config={config}
          activeTabId={activeTabId}
          onSignOut={signOut}
          onNavigate={handleNavigate}
        />
      }
      footer={
        hasTabs ? <BottomTabBar tabs={config.primaryTabs} activeTabId={activeTabId} /> : undefined
      }
    >
      <div className={`px-4 py-6 lg:px-8 ${hasTabs ? 'pb-16 lg:pb-0' : ''}`}>{children}</div>
    </BaseLayout>
  );
}
