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
 *   /results/$surveyId/recommendations — RecommendationsTab
 */

import type { ReactElement } from 'react';
import { createRoute, Outlet, redirect, useNavigate, useParams } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { ResultsLayout } from './components/results-layout';
import { ResultsSkeleton } from './components/results-skeleton';
import { CompassTab, CompassInsightsContent } from './tabs/compass';
import { SurveyDimensionsTab } from './tabs/survey';
import { GroupsTab, GroupsInsights } from './tabs/groups';
import { DialogueTab, DialogueInsightsContent } from './tabs/dialogue';
import { RecommendationsTab, RecommendationsInsightsContent } from './tabs/recommendations';
import { useOverallScores } from './hooks/use-overall-scores';
import { useArchetype } from './hooks/use-archetype';
import { useRiskFlags } from './hooks/use-risk-flags';
import { useScoredSurveys } from './hooks/use-scored-surveys';
import type { ResultsTabId } from './types';

/** Map route path segments to tab IDs. */
const PATH_TO_TAB: Record<string, ResultsTabId> = {
  compass: 'compass',
  survey: 'survey',
  groups: 'groups',
  dialogue: 'dialogue',
  recommendations: 'recommendations',
};

/**
 * Derive active tab from the current child route path.
 * Falls back to 'compass' if no match found.
 */
function useActiveTab(): ResultsTabId {
  // TanStack Router provides the matched route path; extract the last segment
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
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

  // Fetch scored surveys for the picker (organization ID derived server-side via RLS)
  const { data: surveys = [], isLoading: isSurveysLoading } = useScoredSurveys('');

  // Fetch shared data needed by compass tab insights
  const { data: scores, isLoading: scoresLoading } = useOverallScores(surveyId);
  const { data: archetype, isLoading: archetypeLoading } = useArchetype(surveyId);
  const { data: riskFlags = [], isLoading: riskFlagsLoading } = useRiskFlags(surveyId);

  const isContentLoading = scoresLoading || archetypeLoading || riskFlagsLoading;

  function handleTabChange(tabId: ResultsTabId): void {
    void navigate({ to: `/results/${surveyId}/${tabId}` });
  }

  function handleSurveyChange(newSurveyId: string): void {
    void navigate({ to: `/results/${newSurveyId}/${activeTab}` });
  }

  /** Resolve insights panel content based on active tab. */
  function renderInsightsContent(): ReactElement | undefined {
    if (isContentLoading || !scores || !archetype) return undefined;

    switch (activeTab) {
      case 'compass':
        return <CompassInsightsContent scores={scores} riskFlags={riskFlags} activeDimension="overview" />;
      case 'groups':
        return <GroupsInsights surveyId={surveyId} segmentValue="" isBelowThreshold={false} />;
      case 'dialogue':
        return <DialogueInsightsContent />;
      case 'recommendations':
        return <RecommendationsInsightsContent />;
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
      <ResultsLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        surveys={surveys}
        activeSurveyId={surveyId}
        onSurveyChange={handleSurveyChange}
        isSurveysLoading={isSurveysLoading}
        isContentLoading={isContentLoading}
        insightsContent={renderInsightsContent()}
      >
        <Outlet />
      </ResultsLayout>
    </AppShell>
  );
}

/** Compass tab route component. */
function CompassRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  const { data: scores } = useOverallScores(surveyId);
  const { data: archetype } = useArchetype(surveyId);
  const { data: riskFlags = [] } = useRiskFlags(surveyId);

  if (!scores || !archetype) {
    return <ResultsSkeleton />;
  }

  return <CompassTab scores={scores} archetype={archetype} riskFlags={riskFlags} />;
}

/** Survey dimensions tab route component. */
function SurveyRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <SurveyDimensionsTab surveyId={surveyId} />;
}

/** Groups tab route component. */
function GroupsRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <GroupsTab surveyId={surveyId} />;
}

/** Dialogue tab route component. */
function DialogueRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <DialogueTab surveyId={surveyId} />;
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
export function createResultsRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const resultsLayoutRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/results/$surveyId',
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
    component: GroupsRoute,
  });

  const dialogueRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/dialogue',
    component: DialogueRoute,
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
    recommendationsRoute,
  ]);
}
