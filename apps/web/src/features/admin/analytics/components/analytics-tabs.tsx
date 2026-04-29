import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Building2, FileDown, Funnel, Route, Workflow } from 'lucide-react';

export type AnalyticsDashboardTab =
  | 'overview'
  | 'navigation'
  | 'survey'
  | 'admin'
  | 'reports'
  | 'organizations';

export interface AnalyticsTabConfig {
  id: AnalyticsDashboardTab;
  label: string;
  icon: LucideIcon;
}

const ANALYTICS_TABS: readonly AnalyticsTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'navigation', label: 'Navigation', icon: Route },
  { id: 'survey', label: 'Survey flow', icon: Funnel },
  { id: 'admin', label: 'Admin actions', icon: Workflow },
  { id: 'reports', label: 'Reports', icon: FileDown },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
];

export interface AnalyticsTabsProps {
  activeTab: AnalyticsDashboardTab;
  onTabChange: (tab: AnalyticsDashboardTab) => void;
}

export function AnalyticsTabs({
  activeTab,
  onTabChange,
}: AnalyticsTabsProps): ReactElement {
  return (
    <div className="overflow-x-auto border-b border-[var(--grey-100)]">
      <div role="tablist" aria-label="Analytics views" className="flex min-w-max gap-1">
        {ANALYTICS_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-[var(--color-interactive)] text-[var(--grey-900)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--grey-900)]'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
