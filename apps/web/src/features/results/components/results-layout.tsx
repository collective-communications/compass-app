/**
 * Results layout shell with back navigation, 6-tab pill nav, and responsive 65/35 split.
 * Desktop (>=1024px): main content (65%) + insights panel (35%) side-by-side.
 * Mobile: single column with insights stacked below.
 */

import type { ReactElement, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PillTabNav } from '../../../components/navigation/pill-tab-nav';
import { InsightsPanel } from './insights-panel';
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
}

export function ResultsLayout({
  activeTab,
  onTabChange,
  onBack,
  surveyTitle,
  isContentLoading = false,
  children,
  insightsContent,
}: ResultsLayoutProps): ReactElement {
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
      />

      {/* Content: responsive 65/35 split */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div
          role="tabpanel"
          aria-label={`${activeTab} results`}
          className="min-w-0 lg:w-[65%]"
        >
          {children}
        </div>

        {insightsContent !== undefined && (
          <InsightsPanel>{insightsContent}</InsightsPanel>
        )}
      </div>
    </div>
  );
}
