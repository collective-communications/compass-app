/* eslint-disable react-refresh/only-export-components */

/**
 * Results feature route definitions.
 *
 * Exports a factory function that accepts a parent route and returns
 * the complete results route tree for integration into the app router.
 *
 * Route structure:
 *   /results/$surveyId          — layout (AppShell + ResultsLayout)
 *   /results/$surveyId/         — redirects to /compass
 *   /results/$surveyId/compass  — CompassTab
 *   /results/$surveyId/survey   — SurveyDimensionsTab
 *   /results/$surveyId/groups   — GroupsTab
 *   /results/$surveyId/dialogue — DialogueTab
 *   /results/$surveyId/reports  — ReportsTab
 *   /results/$surveyId/recommendations — RecommendationsTab
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { createRoute, Outlet, redirect, useNavigate, useParams, useSearch, useRouterState } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { SegmentType } from '@compass/scoring';
import { useAuthStore } from '../../stores/auth-store';
import { supabase } from '../../lib/supabase';
import { AppShell } from '../../components/shells/app-shell';
import { ResultsLayout } from './components/results-layout';
import { ResultsSkeleton } from './components/results-skeleton';
import { CompassTab, CompassInsightsContent, DimensionNav } from './tabs/compass';
import type { DimensionNavId } from './tabs/compass';
import { SurveyDimensionsTab, SurveyInsightsContent } from './tabs/survey';
import { GroupsTab, GroupsInsights } from './tabs/groups';
import { DialogueTab, DialogueInsightsContent, DialogueTopicSidebar, TopicFilter, deriveTopics } from './tabs/dialogue';
import { DialogueFilterContext } from './context/dialogue-filter-context';
import type { DialogueTopicItem } from './context/dialogue-filter-context';
import { useDialogueResponses } from './hooks/use-dialogue-responses';
import { RecommendationsTab, RecommendationsInsightsContent, RecommendationNav, RecommendationsSidebar } from './tabs/recommendations';
import { ReportsTab, ReportsInsightsContent } from './tabs/reports';
import { useOverallScores } from './hooks/use-overall-scores';
import { useArchetype } from './hooks/use-archetype';
import { useRiskFlags } from './hooks/use-risk-flags';
import { useRecommendations } from './hooks/use-recommendations';
import { severitySortKey } from './lib/severity-mapping';
import { DimensionContext, useActiveDimension } from './context/dimension-context';
import { ReportSelectionContext } from './context/report-selection-context';
import { RecommendationsNavContext } from './context/recommendations-nav-context';
import type { ReportRow } from '../reports/services/report-api';
import type { ResultsTabId } from './types';

export { useActiveDimension } from './context/dimension-context';

/** Map route path segments to tab IDs. */
const PATH_TO_TAB: Record<string, ResultsTabId> = {
  compass: 'compass',
  survey: 'survey',
  groups: 'groups',
  dialogue: 'dialogue',
  reports: 'reports',
  recommendations: 'recommendations',
};

/**
 * Derive active tab from the current child route path.
 * Falls back to 'compass' if no match found.
 */
function useActiveTab(): ResultsTabId {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? '';
  return PATH_TO_TAB[lastSegment] ?? 'compass';
}

/**
 * Layout component for the results section.
 * Wraps content in AppShell and ResultsLayout with tab navigation.
 */
function ResultsLayoutRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  const navigate = useNavigate();
  const activeTab = useActiveTab();
  const routerState = useRouterState();
  const [activeDimension, setActiveDimension] = useState<DimensionNavId>('overview');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeRecIndex, setActiveRecIndex] = useState(0);

  // Fetch dialogue responses to derive topics for the sidebar.
  // TanStack Query deduplicates this with the same call inside DialogueTab.
  const { data: dialogueResponses } = useDialogueResponses({ surveyId });

  const dialogueTopics: DialogueTopicItem[] = useMemo(() => {
    const derived = deriveTopics(dialogueResponses ?? []);
    return derived.map((t) => ({ id: t.questionId, label: t.label, count: t.count }));
  }, [dialogueResponses]);

  const dialogueFilterValue = useMemo(
    () => ({ activeTopicId, setActiveTopicId, topics: dialogueTopics }),
    [activeTopicId, dialogueTopics],
  );

  // Fetch recommendations to derive sorted list for sidebar/mobile strip.
  // TanStack Query deduplicates this with the same call inside RecommendationsTab.
  const { data: recommendations } = useRecommendations(surveyId);

  const sortedRecommendations = useMemo(() => {
    if (!recommendations) return [];
    return [...recommendations].sort(
      (a, b) => severitySortKey(a.severity) - severitySortKey(b.severity) || a.priority - b.priority,
    );
  }, [recommendations]);

  const recommendationsNavValue = useMemo(
    () => ({ activeIndex: activeRecIndex, setActiveIndex: setActiveRecIndex, sortedRecommendations }),
    [activeRecIndex, sortedRecommendations],
  );

  /** Reset dimension selection when switching tabs. */
  const handleDimensionChange = useCallback((dimension: DimensionNavId) => {
    setActiveDimension(dimension);
  }, []);

  // Fetch survey metadata for the back link and title
  const { data: surveyMeta } = useQuery({
    queryKey: ['survey-meta', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('title, organization_id')
        .eq('id', surveyId)
        .single();
      if (error) throw error;
      return data as { title: string; organization_id: string };
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!surveyId,
  });

  // Fetch shared data needed by compass tab insights
  const { data: scores, isLoading: scoresLoading } = useOverallScores(surveyId);
  const { data: archetype, isLoading: archetypeLoading } = useArchetype(surveyId);
  const { data: riskFlags = [], isLoading: riskFlagsLoading } = useRiskFlags(surveyId);

  const isContentLoading = scoresLoading || archetypeLoading || riskFlagsLoading;

  function handleTabChange(tabId: ResultsTabId): void {
    // Survey tab has no 'overview' — default to 'core'
    setActiveDimension(tabId === 'survey' ? 'core' : 'overview');
    setSelectedReport(null);
    setActiveTopicId(null);
    setActiveRecIndex(0);
    void navigate({ to: `/results/${surveyId}/${tabId}` });
  }

  function handleBack(): void {
    if (surveyMeta?.organization_id) {
      void navigate({ to: '/clients/$orgId/overview', params: { orgId: surveyMeta.organization_id } });
    } else {
      void navigate({ to: '/clients' });
    }
  }

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
            onSelect={handleDimensionChange}
            variant="desktop"
          />
        );
      case 'survey':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={handleDimensionChange}
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
            onSelect={handleDimensionChange}
            variant="mobile"
          />
        );
      case 'survey':
        return (
          <DimensionNav
            scores={scores}
            riskFlags={riskFlags}
            activeDimension={activeDimension}
            onSelect={handleDimensionChange}
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
            onViewRecommendations={() => void navigate({ to: `/results/${surveyId}/recommendations` })}
          />
        );
      case 'survey':
        return <SurveyInsightsContent scores={scores} />;
      case 'groups': {
        const routerSearch = routerState.location.search as Record<string, unknown>;
        const st = typeof routerSearch.segmentType === 'string' ? routerSearch.segmentType : 'department';
        const sv = typeof routerSearch.segmentValue === 'string' ? routerSearch.segmentValue : '';
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

  if (isContentLoading) {
    return (
      <AppShell>
        <ResultsSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ReportSelectionContext.Provider value={{ selectedReport, selectReport: setSelectedReport }}>
        <DialogueFilterContext.Provider value={dialogueFilterValue}>
          <RecommendationsNavContext.Provider value={recommendationsNavValue}>
            <ResultsLayout
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onBack={handleBack}
              surveyTitle={surveyMeta?.title}
              isContentLoading={isContentLoading}
              insightsContent={renderInsightsContent()}
              sidebarContent={renderSidebarContent()}
              mobileSidebarContent={renderMobileSidebarContent()}
              sidebarWidth={getSidebarWidth()}
            >
              <DimensionContext.Provider value={{ activeDimension, setActiveDimension: handleDimensionChange }}>
                <Outlet />
              </DimensionContext.Provider>
            </ResultsLayout>
          </RecommendationsNavContext.Provider>
        </DialogueFilterContext.Provider>
      </ReportSelectionContext.Provider>
    </AppShell>
  );
}

/** Compass tab route component. */
function CompassRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  const { data: scores } = useOverallScores(surveyId);
  const { data: archetype } = useArchetype(surveyId);
  const { data: riskFlags = [] } = useRiskFlags(surveyId);
  const { activeDimension, setActiveDimension } = useActiveDimension();

  if (!scores || !archetype) {
    return <ResultsSkeleton />;
  }
  return (
    <CompassTab
      scores={scores}
      archetype={archetype}
      riskFlags={riskFlags}
      activeDimension={activeDimension}
      onDimensionChange={setActiveDimension}
    />
  );
}

/** Survey dimensions tab route component. */
function SurveyRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <SurveyDimensionsTab surveyId={surveyId} />;
}

export interface GroupsSearch {
  segmentType?: string;
  segmentValue?: string;
}

/** Groups tab route component. */
function GroupsRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  const search = useSearch({ strict: false }) as GroupsSearch;
  return (
    <GroupsTab
      surveyId={surveyId}
      initialSegmentType={search.segmentType as SegmentType | undefined}
      initialSegmentValue={search.segmentValue}
    />
  );
}

/** Dialogue tab route component. */
function DialogueRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <DialogueTab surveyId={surveyId} />;
}

/** Reports tab route component. */
function ReportsRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <ReportsTab surveyId={surveyId} />;
}

/** Recommendations tab route component. */
function RecommendationsRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <RecommendationsTab surveyId={surveyId} />;
}

/**
 * Create the results route tree.
 * Accepts a parent route so this module stays decoupled from the root route definition.
 *
 * @param parentRoute - The route under which `/results` should be nested (typically rootRoute).
 * @returns The results layout route with all child tab routes attached.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createResultsRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const resultsLayoutRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/results/$surveyId',
    beforeLoad: async () => {
      const { user } = useAuthStore.getState();
      if (!user) {
        throw redirect({ to: '/auth/login' });
      }
      if (user.tier === 'tier_1') {
        return;
      }
      const { data } = await supabase
        .from('organizations')
        .select('client_access_enabled')
        .eq('id', user.organizationId)
        .single();
      if (!data?.client_access_enabled) {
        throw redirect({ to: '/dashboard' });
      }
    },
    component: ResultsLayoutRoute,
  });

  const resultsIndexRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/',
    beforeLoad: ({ params }) => {
      throw redirect({
        to: '/results/$surveyId/compass',
        params: { surveyId: (params as { surveyId: string }).surveyId },
      });
    },
    component: () => null as unknown as ReactElement,
  });

  const compassRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/compass',
    component: CompassRoute,
  });

  const surveyDimensionsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/survey',
    component: SurveyRoute,
  });

  const groupsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/groups',
    validateSearch: (search: Record<string, unknown>): GroupsSearch => ({
      segmentType: typeof search.segmentType === 'string' ? search.segmentType : undefined,
      segmentValue: typeof search.segmentValue === 'string' ? search.segmentValue : undefined,
    }),
    component: GroupsRoute,
  });

  const dialogueRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/dialogue',
    component: DialogueRoute,
  });

  const reportsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/reports',
    component: ReportsRoute,
  });

  const recommendationsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/recommendations',
    component: RecommendationsRoute,
  });

  return resultsLayoutRoute.addChildren([
    resultsIndexRoute,
    compassRoute,
    surveyDimensionsRoute,
    groupsRoute,
    dialogueRoute,
    reportsRoute,
    recommendationsRoute,
  ]);
}
