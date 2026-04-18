/**
 * Results layout shell with back navigation, 6-tab pill nav, and responsive grid.
 * Desktop (>=1024px): optional sidebar + main content + insights panel (CSS Grid).
 * Mobile: single column with mobile sidebar strip above main, insights stacked below.
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PillTabNav, tabPanelId } from '../../../components/navigation/pill-tab-nav';
import { InsightsPanel } from './insights-panel';
import { SidebarColumn } from './sidebar-column';
import { ResultsSkeleton } from './results-skeleton';
import { RESULTS_TABS, type ResultsTabId } from '../types';

interface ResultsLayoutProps {
  /** Currently active tab */
  activeTab: ResultsTabId;
  /** Called when a tab pill is selected */
  onTabChange: (tabId: ResultsTabId) => void;
  /** Called when the back button is pressed */
  onBack: () => void;
  /** Survey title shown next to the back arrow */
  surveyTitle?: string;
  /** Whether tab content is loading */
  isContentLoading?: boolean;
  /** Main content area (tab panel content) */
  children: ReactNode;
  /** Content for the insights side panel */
  insightsContent?: ReactNode;
  /** Desktop left sidebar content (vertical nav). Hidden on mobile. */
  sidebarContent?: ReactNode;
  /** Mobile sidebar content (horizontal strip). Shown above main on mobile, hidden on desktop. */
  mobileSidebarContent?: ReactNode;
  /** Fixed sidebar width in pixels. Defaults to 200. */
  sidebarWidth?: number;
}

export function ResultsLayout({
  activeTab,
  onTabChange,
  onBack,
  surveyTitle,
  isContentLoading = false,
  children,
  insightsContent,
  sidebarContent,
  mobileSidebarContent,
  sidebarWidth = 200,
}: ResultsLayoutProps): ReactElement {
  const hasSidebar = sidebarContent !== undefined;
  const hasInsights = insightsContent !== undefined;

  const gridColumns = useMemo(() => {
    if (hasSidebar && hasInsights) return `${sidebarWidth}px 1fr minmax(0, 35%)`;
    if (hasSidebar) return `${sidebarWidth}px 1fr`;
    if (hasInsights) return '1fr minmax(0, 35%)';
    return '1fr';
  }, [hasSidebar, hasInsights, sidebarWidth]);

  if (isContentLoading) {
    return <ResultsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button + survey title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
          aria-label="Back to surveys"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {surveyTitle && (
          <h1 className="text-lg font-semibold text-[var(--grey-900)]">{surveyTitle}</h1>
        )}
      </div>

      {/* Pill tabs — left-aligned */}
      <PillTabNav
        tabs={RESULTS_TABS}
        activeId={activeTab}
        onSelect={(id) => onTabChange(id as ResultsTabId)}
        ariaLabel="Results tabs"
        idPrefix="results"
      />

      {/* Mobile sidebar strip — shown above main content on mobile only */}
      {mobileSidebarContent && (
        <div className="lg:hidden">{mobileSidebarContent}</div>
      )}

      {/* Content grid: responsive 3-column (or 2-column / 1-column fallback) */}
      <div
        className="flex flex-col gap-6 lg:grid lg:items-start lg:gap-6"
        style={{ gridTemplateColumns: gridColumns } as CSSProperties}
      >
        {hasSidebar && (
          <SidebarColumn>{sidebarContent}</SidebarColumn>
        )}

        <div
          role="tabpanel"
          id={tabPanelId('results', activeTab)}
          aria-labelledby={`results-${activeTab}`}
          className="min-w-0"
        >
          {children}
        </div>

        {hasInsights && (
          <InsightsPanel>{insightsContent}</InsightsPanel>
        )}
      </div>
    </div>
  );
}
