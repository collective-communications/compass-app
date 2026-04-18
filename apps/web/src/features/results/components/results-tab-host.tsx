/**
 * ResultsTabHost — per-tab dispatcher that selects sidebar, mobile strip,
 * insights panel content, and sidebar width based on the active tab.
 *
 * Extracted from the results route body so the route stays focused on
 * data loading + layout composition. Reads active-tab-scoped state from
 * `ResultsSidebarProvider` contexts and composes the layout children.
 */

import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useContext, type ReactElement } from 'react';
import type { SegmentType, DimensionScoreMap, ArchetypeMatch, RiskFlag } from '@compass/scoring';
import { ResultsLayout } from './results-layout';
import { CompassInsightsContent, DimensionNav } from '../tabs/compass';
import { SurveyInsightsContent } from '../tabs/survey';
import { GroupsInsights } from '../tabs/groups';
import {
  DialogueInsightsContent,
  DialogueTopicSidebar,
  TopicFilter,
} from '../tabs/dialogue';
import {
  RecommendationsInsightsContent,
  RecommendationNav,
  RecommendationsSidebar,
} from '../tabs/recommendations';
import { ReportsInsightsContent } from '../tabs/reports';
import { DialogueFilterContext } from '../context/dialogue-filter-context';
import { RecommendationsNavContext } from '../context/recommendations-nav-context';
import { useActiveDimension } from '../context/dimension-context';
import type { ResultsTabId } from '../types';

interface ResultsTabHostProps {
  surveyId: string;
  activeTab: ResultsTabId;
  onTabChange: (tabId: ResultsTabId) => void;
  onBack: () => void;
  surveyTitle: string | undefined;
  isContentLoading: boolean;
  scores: DimensionScoreMap | undefined;
  archetype: ArchetypeMatch | undefined;
  riskFlags: RiskFlag[];
}

/**
 * Composes ResultsLayout with per-tab sidebar, insights, and mobile strip.
 * All tab-scoped state is pulled from contexts provided by
 * `ResultsSidebarProvider` — this component stays pure UI dispatch.
 */
export function ResultsTabHost({
  surveyId,
  activeTab,
  onTabChange,
  onBack,
  surveyTitle,
  isContentLoading,
  scores,
  archetype,
  riskFlags,
}: ResultsTabHostProps): ReactElement {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { activeDimension, setActiveDimension } = useActiveDimension();
  const dialogueFilter = useContext(DialogueFilterContext);
  const recommendationsNav = useContext(RecommendationsNavContext);

  const dialogueTopics = dialogueFilter.topics;
  const activeTopicId = dialogueFilter.activeTopicId;
  const setActiveTopicId = dialogueFilter.setActiveTopicId;
  const sortedRecommendations = recommendationsNav.sortedRecommendations;
  const activeRecIndex = recommendationsNav.activeIndex;
  const setActiveRecIndex = recommendationsNav.setActiveIndex;

  /** Resolve desktop sidebar content based on active tab. */
  function renderSidebarContent(): ReactElement | undefined {
    if (isContentLoading || !scores) return undefined;

    switch (activeTab) {
      case 'compass':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={setActiveDimension}
            variant="desktop"
          />
        );
      case 'survey':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={setActiveDimension}
            variant="desktop"
            includeOverview={false}
          />
        );
      case 'dialogue':
        return (
          <DialogueTopicSidebar
            topics={dialogueTopics}
            activeTopicId={activeTopicId}
            onSelect={setActiveTopicId}
          />
        );
      case 'recommendations':
        if (sortedRecommendations.length === 0) return undefined;
        return (
          <RecommendationsSidebar
            recommendations={sortedRecommendations}
            activeIndex={activeRecIndex}
            onSelect={setActiveRecIndex}
          />
        );
      default:
        return undefined;
    }
  }

  /** Resolve mobile sidebar strip content based on active tab. */
  function renderMobileSidebarContent(): ReactElement | undefined {
    if (isContentLoading || !scores) return undefined;

    switch (activeTab) {
      case 'compass':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={setActiveDimension}
            variant="mobile"
          />
        );
      case 'survey':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={setActiveDimension}
            variant="mobile"
            includeOverview={false}
          />
        );
      case 'dialogue':
        return (
          <TopicFilter
            topics={dialogueTopics.map((t) => ({
              questionId: t.id,
              label: t.label,
              fullText: t.label,
              count: t.count,
            }))}
            activeTopicId={activeTopicId}
            onTopicChange={setActiveTopicId}
          />
        );
      case 'recommendations':
        if (sortedRecommendations.length === 0) return undefined;
        return (
          <RecommendationNav
            recommendations={sortedRecommendations}
            activeIndex={activeRecIndex}
            onSelect={setActiveRecIndex}
          />
        );
      default:
        return undefined;
    }
  }

  /** Resolve sidebar width based on active tab. */
  function getSidebarWidth(): number {
    switch (activeTab) {
      case 'compass':
      case 'survey':
        return 200;
      case 'dialogue':
        return 240;
      case 'recommendations':
        return 280;
      default:
        return 200;
    }
  }

  /** Resolve insights panel content based on active tab. */
  function renderInsightsContent(): ReactElement | undefined {
    if (activeTab === 'reports') {
      return <ReportsInsightsContent />;
    }

    if (isContentLoading || !scores || !archetype) return undefined;

    switch (activeTab) {
      case 'compass':
        return (
          <CompassInsightsContent
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onViewRecommendations={() =>
              void navigate({ to: `/results/${surveyId}/recommendations` })
            }
          />
        );
      case 'survey':
        return <SurveyInsightsContent scores={scores} />;
      case 'groups': {
        const routerSearch = routerState.location.search as Record<string, unknown>;
        const st =
          typeof routerSearch.segmentType === 'string' ? routerSearch.segmentType : 'department';
        const sv =
          typeof routerSearch.segmentValue === 'string' ? routerSearch.segmentValue : '';
        return (
          <GroupsInsights
            surveyId={surveyId}
            segmentType={st as SegmentType}
            segmentValue={sv}
            isBelowThreshold={!sv}
            onSegmentChange={(value: string) => {
              void navigate({
                to: `/results/${surveyId}/groups`,
                search: { segmentType: st, segmentValue: value },
              });
            }}
          />
        );
      }
      case 'dialogue':
        return <DialogueInsightsContent />;
      case 'recommendations':
        return <RecommendationsInsightsContent surveyId={surveyId} />;
      default:
        return undefined;
    }
  }

  return (
    <ResultsLayout
      activeTab={activeTab}
      onTabChange={onTabChange}
      onBack={onBack}
      surveyTitle={surveyTitle}
      isContentLoading={isContentLoading}
      insightsContent={renderInsightsContent()}
      sidebarContent={renderSidebarContent()}
      mobileSidebarContent={renderMobileSidebarContent()}
      sidebarWidth={getSidebarWidth()}
    >
      <Outlet />
    </ResultsLayout>
  );
}
