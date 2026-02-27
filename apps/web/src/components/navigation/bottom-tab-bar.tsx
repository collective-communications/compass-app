import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building,
  TrendingUp,
  Settings,
  LayoutGrid,
  Compass,
  FileDown,
} from 'lucide-react';
import type { TabConfig } from '../../lib/navigation';

const ICON_MAP: Record<string, typeof Building> = {
  building: Building,
  'trending-up': TrendingUp,
  settings: Settings,
  'layout-grid': LayoutGrid,
  compass: Compass,
  'file-down': FileDown,
};

interface BottomTabBarProps {
  tabs: TabConfig[];
  activeTabId: string | null;
}

export function BottomTabBar({ tabs, activeTabId }: BottomTabBarProps): ReactElement {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-[var(--grey-300)] bg-[var(--grey-50)] lg:hidden">
      <ul className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon];
          const isActive = tab.id === activeTabId;
          const isDisabled = tab.disabled === true;

          if (isDisabled) {
            return (
              <li key={tab.id}>
                <span className="flex flex-col items-center gap-0.5 px-3 py-1 opacity-40">
                  {Icon && <Icon size={20} />}
                  <span className="text-xs">{tab.label}</span>
                </span>
              </li>
            );
          }

          return (
            <li key={tab.id}>
              <Link
                to={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? 'text-[var(--color-core)]' : 'text-[var(--grey-500)]'
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
