import type { ReactElement } from 'react';
import { AppLink as Link } from './app-link';
import type { TabConfig } from '../../lib/navigation';
import { ICON_MAP } from '../../lib/icons';

interface BottomTabBarProps {
  tabs: TabConfig[];
  activeTabId: string | null;
}

export function BottomTabBar({ tabs, activeTabId }: BottomTabBarProps): ReactElement {
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-10 border-t border-[var(--grey-300)] bg-[var(--grey-50)] lg:hidden">
      <ul className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon];
          const isActive = tab.id === activeTabId;
          const isDisabled = tab.disabled === true;

          if (isDisabled) {
            return (
              <li key={tab.id}>
                <button type="button" disabled aria-disabled="true" className="flex flex-col items-center gap-0.5 px-3 py-1 opacity-40 cursor-default bg-transparent border-none">
                  {Icon && <Icon size={20} />}
                  <span className="text-xs">{tab.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={tab.id}>
              <Link
                to={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? 'text-[var(--color-core-text)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {Icon && <Icon size={20} />}
                <span className="text-xs">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
