/* eslint-disable react-refresh/only-export-components */

/**
 * Route component definitions for the results feature.
 *
 * This file holds the layout component (`ResultsLayoutRoute`) plus the
 * per-tab route wrappers (`CompassRoute`, `SurveyRoute`, `GroupsRoute`,
 * `DialogueRoute`, `ReportsRoute`, `RecommendationsRoute`).
 *
 * Kept separate from `routes.tsx` so the whole results surface — the layout,
 * every tab, all insights panels, and their transitive imports — can be
 * served in a dedicated lazy-loaded chunk. `routes.tsx` pulls these in via
 * `React.lazy(() => import('./route-components'))`, keeping the initial app
 * bundle lean for unauthenticated visitors and survey respondents.
 *
 * ## Decomposition
 *
 * The old ~360-line `ResultsLayoutRoute` body has been split into:
 *   - `components/results-sidebar-provider.tsx` — owns all per-tab state
 *     (active dimension, selected report, dialogue topic, rec index) and
 *     the four context providers consumed by the tabs.
 *   - `components/results-tab-host.tsx` — dispatches sidebar, mobile strip,
 *     and insights panel content based on the active tab.
 *
 * `ResultsLayoutRoute` now only handles data loading + layout composition.
 */

import { type ReactElement } from 'react';
import { useNavigate, useParams, useSearch, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { SegmentType } from '@compass/scoring';
import { supabase } from '../../lib/supabase';
import { STALE_TIMES } from '../../lib/query-config';
import { AppShell } from '../../components/shells/app-shell';
import { ResultsSkeleton } from './components/results-skeleton';
import { ResultsSidebarProvider } from './components/results-sidebar-provider';
import { ResultsTabHost } from './components/results-tab-host';
import { CompassTab } from './tabs/compass';
import { SurveyDimensionsTab } from './tabs/survey';
import { GroupsTab } from './tabs/groups';
import { DialogueTab } from './tabs/dialogue';
import { RecommendationsTab } from './tabs/recommendations';
import { ReportsTab } from './tabs/reports';
import { HistoryTab } from './tabs/history';
import { useOverallScores } from './hooks/use-overall-scores';
import { useArchetype } from './hooks/use-archetype';
import { useRiskFlags } from './hooks/use-risk-flags';
import { resultKeys } from './lib/query-keys';
import { useActiveDimension } from './context/dimension-context';
import type { ResultsTabId } from './types';
import type { GroupsSearch } from './types';

/** Map route path segments to tab IDs. */
const PATH_TO_TAB: Record<string, ResultsTabId> = {
  compass: 'compass',
  survey: 'survey',
  groups: 'groups',
  dialogue: 'dialogue',
  reports: 'reports',
  recommendations: 'recommendations',
  history: 'history',
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
 *
 * Responsibilities kept here:
 *   - Resolve `surveyId` + active tab from router state.
 *   - Load shared data (survey metadata, overall scores, archetype, risk flags).
 *   - Render the loading skeleton until shared data is ready.
 *
 * Per-tab dispatch (sidebars, insights panels, mobile strip) lives in
 * `ResultsTabHost`. All tab-scoped state (active dimension, selected report,
 * active dialogue topic, active recommendation index) lives in
 * `ResultsSidebarProvider`.
 */
export function ResultsLayoutRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  const navigate = useNavigate();
  const activeTab = useActiveTab();

  // Fetch survey metadata for the back link and title.
  const { data: surveyMeta } = useQuery({
    queryKey: resultKeys.surveyMeta(surveyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('title, organization_id')
        .eq('id', surveyId)
        .single();
      if (error) throw error;
      return data as { title: string; organization_id: string };
    },
    staleTime: STALE_TIMES.static,
    enabled: !!surveyId,
  });

  // Fetch shared data needed by multiple tabs.
  const { data: scores, isLoading: scoresLoading } = useOverallScores(surveyId);
  const { data: archetype, isLoading: archetypeLoading } = useArchetype(surveyId);
  const { data: riskFlags = [], isLoading: riskFlagsLoading } = useRiskFlags(surveyId);

  const isContentLoading = scoresLoading || archetypeLoading || riskFlagsLoading;

  function handleTabChange(tabId: ResultsTabId): void {
    void navigate({ to: `/results/${surveyId}/${tabId}` });
  }

  function handleBack(): void {
    if (surveyMeta?.organization_id) {
      void navigate({
        to: '/clients/$orgId/overview',
        params: { orgId: surveyMeta.organization_id },
      });
    } else {
      void navigate({ to: '/clients' });
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
      <ResultsSidebarProvider surveyId={surveyId} activeTab={activeTab}>
        <ResultsTabHost
          surveyId={surveyId}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onBack={handleBack}
          surveyTitle={surveyMeta?.title}
          isContentLoading={isContentLoading}
          scores={scores}
          archetype={archetype}
          riskFlags={riskFlags}
        />
      </ResultsSidebarProvider>
    </AppShell>
  );
}

/** Compass tab route component. */
export function CompassRoute(): ReactElement {
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
export function SurveyRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <SurveyDimensionsTab surveyId={surveyId} />;
}

/** Groups tab route component. */
export function GroupsRoute(): ReactElement {
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
export function DialogueRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <DialogueTab surveyId={surveyId} />;
}

/** Reports tab route component. */
export function ReportsRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <ReportsTab surveyId={surveyId} />;
}

/** Recommendations tab route component. */
export function RecommendationsRoute(): ReactElement {
  return <RecommendationsTab />;
}

/** History (Trends) tab route component. */
export function HistoryRoute(): ReactElement {
  const { surveyId } = useParams({ strict: false }) as { surveyId: string };
  return <HistoryTab surveyId={surveyId} />;
}
