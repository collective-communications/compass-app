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
 *
 * ## Code splitting
 *
 * All route components live in `./route-components.tsx` so they ship in a
 * dedicated lazy-loaded chunk. The initial app bundle only pays the cost of
 * the factory below; the heavy layout + every tab is fetched on first
 * navigation into the results section. `<Suspense>` wraps each route's
 * render tree with the shared `<RouteLoading />` fallback.
 */

import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/auth-store';
import { guardClientAccess } from '../../lib/route-guards';
import { RouteLoading } from '../../components/app/route-loading';
import type { GroupsSearch } from './types';

// Re-export the dimension hook for external consumers that were importing
// it from this module before the split.
export { useActiveDimension } from './context/dimension-context';
export type { GroupsSearch } from './types';

// ── Lazy route components ───────────────────────────────────────────────────
// The entire `./route-components` module — layout + all tabs + their
// transitive imports (tab body, insights panels, derived contexts) — is
// served as one dynamic chunk. This matches the user journey: someone
// landing on any results sub-route pulls the whole results surface at once
// and then navigates laterally for free.

const ResultsLayoutRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.ResultsLayoutRoute })),
);
const CompassRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.CompassRoute })),
);
const SurveyRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.SurveyRoute })),
);
const GroupsRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.GroupsRoute })),
);
const DialogueRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.DialogueRoute })),
);
const ReportsRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.ReportsRoute })),
);
const RecommendationsRoute = lazy(() =>
  import('./route-components').then((m) => ({ default: m.RecommendationsRoute })),
);

/** Wrap a lazy route component in a Suspense boundary with the shared loader. */
function withSuspense(Component: ComponentType): () => ReactElement {
  return function SuspensedRoute(): ReactElement {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Component />
      </Suspense>
    );
  };
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
      await guardClientAccess(user);
    },
    component: withSuspense(ResultsLayoutRoute),
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
    component: withSuspense(CompassRoute),
  });

  const surveyDimensionsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/survey',
    component: withSuspense(SurveyRoute),
  });

  const groupsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/groups',
    validateSearch: (search: Record<string, unknown>): GroupsSearch => ({
      segmentType: typeof search.segmentType === 'string' ? search.segmentType : undefined,
      segmentValue: typeof search.segmentValue === 'string' ? search.segmentValue : undefined,
    }),
    component: withSuspense(GroupsRoute),
  });

  const dialogueRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/dialogue',
    component: withSuspense(DialogueRoute),
  });

  const reportsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/reports',
    component: withSuspense(ReportsRoute),
  });

  const recommendationsRoute = createRoute({
    getParentRoute: () => resultsLayoutRoute,
    path: '/recommendations',
    component: withSuspense(RecommendationsRoute),
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
