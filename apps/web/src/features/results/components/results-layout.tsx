/**
 * Results layout shell with 5-tab pill navigation and responsive 65/35 split.
 * Desktop (>=1024px): main content (65%) + insights panel (35%) side-by-side.
 * Mobile: single column with insights stacked below.
 */

import type { ReactElement, ReactNode } from 'react';
import { PillTabNav } from '../../../components/navigation/pill-tab-nav';
import { SurveyPicker } from './survey-picker';
import { InsightsPanel } from './insights-panel';
import { ResultsSkeleton } from './results-skeleton';
import { RESULTS_TABS, type ResultsTabId } from '../types';
import type { ScoredSurvey } from '../types';

interface ResultsLayoutProps {
  /** Currently active tab */
  activeTab: ResultsTabId;
  /** Called when a tab pill is selected */
  onTabChange: (tabId: ResultsTabId) => void;
  /** Available scored surveys for the picker */
  surveys: ScoredSurvey[];
  /** Currently selected survey ID */
  activeSurveyId: string;
  /** Called when a different survey is selected */
  onSurveyChange: (surveyId: string) => void;
  /** Whether surveys are still loading */
  isSurveysLoading?: boolean;
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
  surveys,
  activeSurveyId,
  onSurveyChange,
  isSurveysLoading = false,
  isContentLoading = false,
  children,
  insightsContent,
}: ResultsLayoutProps): ReactElement {
  if (isContentLoading) {
    return <ResultsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: survey picker + pill tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SurveyPicker
          surveys={surveys}
          activeSurveyId={activeSurveyId}
          onSelect={onSurveyChange}
          isLoading={isSurveysLoading}
        />
        <PillTabNav
          tabs={RESULTS_TABS}
          activeId={activeTab}
          onSelect={(id) => onTabChange(id as ResultsTabId)}
        />
      </div>

      {/* Content: responsive 65/35 split */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <main
          role="tabpanel"
          aria-label={`${activeTab} results`}
          className="min-w-0 lg:w-[65%]"
        >
          {children}
        </main>

        {insightsContent !== undefined && (
          <InsightsPanel>{insightsContent}</InsightsPanel>
        )}
      </div>
    </div>
  );
}
