/**
 * Admin-owned route definitions for TanStack Router.
 *
 * These routes cover the CC+C team's surface: client management, survey
 * authoring/publishing, and user administration. They are registered as
 * top-level paths (no `/admin` prefix) so URLs don't leak role/tier. Access
 * is enforced per-path by `guardRoute(path)` against the central
 * `ROUTE_ACCESS` matrix.
 *
 * The unified `/settings` route (tier-aware content) lives in
 * `features/settings` — it is not declared here. Likewise `/help`, `/profile`.
 *
 * ## Code splitting
 *
 * Heavy admin page components (survey builder, client detail, users list,
 * org settings) are loaded via `React.lazy` so they ship in their own chunks
 * and don't bloat the initial bundle shipped to respondents or new visitors.
 * Each route's render tree is wrapped in `<Suspense fallback={<RouteLoading />}>`.
 *
 * The small building blocks used inline (`DeploymentPanel`, `ResponseTracker`)
 * stay eager — they're needed on the publish page's synchronous render path
 * once the dynamic parent chunk has loaded, and lazy-loading them separately
 * would multiply network round-trips for no real savings.
 */

import { Suspense, lazy, type ReactElement } from 'react';
import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/auth-store';
import { AppShell } from '../../components/shells/app-shell';
import { RouteLoading } from '../../components/app/route-loading';
import { guardRoute } from '../../lib/route-guards';
import { DeploymentPanel, ResponseTracker } from './surveys';
import { useDeploymentManagement } from './surveys/hooks/use-deployment-management';
import { useResponseTracking } from './surveys/hooks/use-response-tracking';
import { useRealtimeResponses } from './surveys/hooks/use-realtime-responses';
import { useSurveyBuilder } from './surveys/hooks/use-survey-builder';

// ── Lazy page components ────────────────────────────────────────────────────
// Each page is a distinct chunk so we don't drag the full admin surface into
// the initial JS payload. Imports point at the module file directly (not the
// barrel) so Rollup can tree-shake and code-split cleanly.

const SurveyBuilderPage = lazy(() =>
  import('./surveys/components/survey-builder-page').then((m) => ({ default: m.SurveyBuilderPage })),
);
const ClientListPage = lazy(() =>
  import('./clients/pages/client-list-page').then((m) => ({ default: m.ClientListPage })),
);
const ClientDetailPage = lazy(() =>
  import('./clients/pages/client-detail-page').then((m) => ({ default: m.ClientDetailPage })),
);
const ClientDetailOverviewTab = lazy(() =>
  import('./clients/components/client-detail-overview-tab').then((m) => ({
    default: m.ClientDetailOverviewTab,
  })),
);
const ClientDetailSurveysTab = lazy(() =>
  import('./clients/components/client-detail-surveys-tab').then((m) => ({
    default: m.ClientDetailSurveysTab,
  })),
);
const ClientUsersTab = lazy(() =>
  import('./clients/components/client-users-tab').then((m) => ({ default: m.ClientUsersTab })),
);
const OrgSettingsPage = lazy(() =>
  import('./clients/pages/org-settings-page').then((m) => ({ default: m.OrgSettingsPage })),
);
const UsersPage = lazy(() =>
  import('./users/pages/users-page').then((m) => ({ default: m.UsersPage })),
);

/**
 * Creates the flat set of admin-owned routes. Each is a top-level child of
 * `rootRoute`, not nested under an `/admin` layout. The caller spreads the
 * returned array into `rootRoute.addChildren(...)`.
 */
export function createAdminRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  // ── /clients (list) ──────────────────────────────────────────────────────
  const clientsListRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/clients',
    beforeLoad: () => guardRoute('/clients'),
    component: function ClientsListLayout(): ReactElement {
      const navigate = useNavigate();
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <ClientListPage
              onSelectClient={(orgId) => {
                void navigate({ to: '/clients/$orgId/overview', params: { orgId } });
              }}
            />
          </Suspense>
        </AppShell>
      );
    },
  });

  // ── /clients/$orgId (layout — redirects to /overview when hit directly) ──
  const clientDetailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/clients/$orgId',
    beforeLoad: async ({ params: { orgId }, location }) => {
      guardRoute('/clients');
      const basePath = `/clients/${orgId}`;
      if (location.pathname === basePath || location.pathname === `${basePath}/`) {
        throw redirect({
          to: '/clients/$orgId/overview',
          params: { orgId },
          replace: true,
        });
      }
    },
    component: function ClientDetailLayout(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <ClientDetailPage orgId={orgId} />
          </Suspense>
        </AppShell>
      );
    },
  });

  const clientOverviewRoute = createRoute({
    getParentRoute: () => clientDetailRoute,
    path: '/overview',
    component: function ClientOverviewPage(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      return (
        <Suspense fallback={<RouteLoading />}>
          <ClientDetailOverviewTab orgId={orgId} />
        </Suspense>
      );
    },
  });

  const clientSurveysRoute = createRoute({
    getParentRoute: () => clientDetailRoute,
    path: '/surveys',
    component: function ClientSurveysPage(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      const user = useAuthStore((s) => s.user);
      const navigate = useNavigate();
      return (
        <Suspense fallback={<RouteLoading />}>
          <ClientDetailSurveysTab
            organizationId={orgId}
            userId={user?.id ?? ''}
            onSelectSurvey={(surveyId) => {
              void navigate({ to: '/surveys/$surveyId', params: { surveyId } });
            }}
            onEditQuestions={(surveyId) => {
              void navigate({ to: '/surveys/$surveyId', params: { surveyId } });
            }}
            onViewResults={(surveyId) => {
              void navigate({ to: '/results/$surveyId/compass', params: { surveyId } });
            }}
          />
        </Suspense>
      );
    },
  });

  const clientUsersRoute = createRoute({
    getParentRoute: () => clientDetailRoute,
    path: '/users',
    component: function ClientUsersPage(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      return (
        <Suspense fallback={<RouteLoading />}>
          <ClientUsersTab organizationId={orgId} />
        </Suspense>
      );
    },
  });

  // ── /clients/$orgId/settings (standalone — not under detail layout) ──────
  const clientSettingsRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/clients/$orgId/settings',
    beforeLoad: () => guardRoute('/clients'),
    component: function ClientSettingsLayout(): ReactElement {
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <OrgSettingsPage />
          </Suspense>
        </AppShell>
      );
    },
  });

  // ── /surveys/$surveyId (builder) ─────────────────────────────────────────
  const surveyBuilderRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/surveys/$surveyId',
    beforeLoad: () => guardRoute('/surveys'),
    component: function SurveyBuilderLayout(): ReactElement {
      const { surveyId } = surveyBuilderRoute.useParams() as { surveyId: string };
      const navigate = useNavigate();
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <SurveyBuilderPage
              surveyId={surveyId}
              onBack={(organizationId: string) => {
                void navigate({
                  to: '/clients/$orgId/overview',
                  params: { orgId: organizationId },
                });
              }}
            />
          </Suspense>
        </AppShell>
      );
    },
  });

  // ── /surveys/$surveyId/publish ───────────────────────────────────────────
  const surveyPublishRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/surveys/$surveyId/publish',
    beforeLoad: () => guardRoute('/surveys'),
    component: function SurveyPublishLayout(): ReactElement {
      const { surveyId } = surveyPublishRoute.useParams() as { surveyId: string };
      const { deployment, unpublish, isPending } = useDeploymentManagement({ surveyId });
      const metricsQuery = useResponseTracking({ surveyId });
      const { connectionStatus } = useRealtimeResponses({
        surveyId,
        deploymentId: deployment.data?.id ?? null,
      });
      const builderQuery = useSurveyBuilder({ surveyId });

      if (deployment.isLoading || metricsQuery.isLoading || builderQuery.isLoading) {
        return (
          <AppShell>
            <div className="flex items-center justify-center py-12">
              <p className="text-[var(--text-secondary)]">Loading published survey...</p>
            </div>
          </AppShell>
        );
      }

      if (!deployment.data || !builderQuery.data) {
        return (
          <AppShell>
            <div className="flex items-center justify-center py-12">
              <p className="text-[var(--text-secondary)]">No published survey found.</p>
            </div>
          </AppShell>
        );
      }

      return (
        <AppShell>
          <div className="space-y-6">
            <DeploymentPanel
              deployment={deployment.data}
              survey={builderQuery.data.survey}
              onDeactivate={() => {
                void unpublish();
              }}
              isPending={isPending}
            />
            {metricsQuery.data && (
              <ResponseTracker
                metrics={metricsQuery.data}
                connectionStatus={connectionStatus}
              />
            )}
          </div>
        </AppShell>
      );
    },
  });

  // ── /users (CCC_ADMIN only — enforced by ROUTE_ACCESS) ───────────────────
  const usersRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/users',
    beforeLoad: () => guardRoute('/users'),
    component: function UsersLayout(): ReactElement {
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <UsersPage />
          </Suspense>
        </AppShell>
      );
    },
  });

  return [
    clientsListRoute,
    clientDetailRoute.addChildren([
      clientOverviewRoute,
      clientSurveysRoute,
      clientUsersRoute,
    ]),
    clientSettingsRoute,
    surveyBuilderRoute,
    surveyPublishRoute,
    usersRoute,
  ];
}
