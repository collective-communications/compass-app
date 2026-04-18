import type { ReactElement } from 'react';
import { AppLink as Link } from './app-link';
import type { TabConfig } from '../../lib/navigation';
import { ICON_MAP } from '../../lib/icons';

/**
 * Props for {@link BottomTabBar}.
 */
interface BottomTabBarProps {
  /** Tabs to render, resolved for the current user's tier. */
  tabs: TabConfig[];
  /** `id` of the currently active tab, or `null` if no tab matches the current route. */
  activeTabId: string | null;
}

/**
 * Mobile-only fixed bottom tab bar (`lg:hidden`). Desktop uses the header's
 * {@link PillTabNav} for the same destinations — the mobile/desktop consistency
 * described in the project UI philosophy.
 *
 * Disabled tabs render as non-interactive buttons at 40% opacity rather than
 * being hidden, preserving layout and discoverability.
 */
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
                  {Icon && <Icon size={20} aria-hidden={true} />}
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
                {Icon && <Icon size={20} aria-hidden={true} />}
                <span className="text-xs">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
