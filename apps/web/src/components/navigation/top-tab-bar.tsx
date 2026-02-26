import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import type { TabConfig } from '../../lib/navigation';

interface TopTabBarProps {
  tabs: TabConfig[];
  activeTabId: string | null;
}

export function TopTabBar({ tabs, activeTabId }: TopTabBarProps): ReactElement {
  return (
    <nav className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDisabled = tab.disabled === true;

          if (isDisabled) {
            return (
              <li key={tab.id}>
                <span className="inline-block rounded-full px-4 py-1 text-sm opacity-40">
                  {tab.label}
                </span>
              </li>
            );
          }

          return (
            <li key={tab.id}>
              <Link
                to={tab.href}
                className={`inline-block rounded-full px-4 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--grey-900)] text-white'
                    : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
