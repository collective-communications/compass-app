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
 */

import type { ReactElement } from 'react';
import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/auth-store';
import { AppShell } from '../../components/shells/app-shell';
import { guardRoute } from '../../lib/route-guards';
import {
  SurveyBuilderPage,
  DeploymentPanel,
  ResponseTracker,
} from './surveys';
import { useDeploymentManagement } from './surveys/hooks/use-deployment-management';
import { useResponseTracking } from './surveys/hooks/use-response-tracking';
import { useRealtimeResponses } from './surveys/hooks/use-realtime-responses';
import { useSurveyBuilder } from './surveys/hooks/use-survey-builder';
import { ClientListPage } from './clients';
import { ClientDetailPage } from './clients/pages/client-detail-page';
import { ClientDetailOverviewTab } from './clients/components/client-detail-overview-tab';
import { ClientDetailSurveysTab } from './clients/components/client-detail-surveys-tab';
import { ClientUsersTab } from './clients/components/client-users-tab';
import { OrgSettingsPage } from './clients/pages/org-settings-page';
import { UsersPage } from './users';

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
          <ClientListPage
            onSelectClient={(orgId) => {
              void navigate({ to: '/clients/$orgId/overview', params: { orgId } });
            }}
          />
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
          <ClientDetailPage orgId={orgId} />
        </AppShell>
      );
    },
  });

  const clientOverviewRoute = createRoute({
    getParentRoute: () => clientDetailRoute,
    path: '/overview',
    component: function ClientOverviewPage(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      return <ClientDetailOverviewTab orgId={orgId} />;
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
      );
    },
  });

  const clientUsersRoute = createRoute({
    getParentRoute: () => clientDetailRoute,
    path: '/users',
    component: function ClientUsersPage(): ReactElement {
      const { orgId } = clientDetailRoute.useParams() as { orgId: string };
      return <ClientUsersTab organizationId={orgId} />;
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
          <OrgSettingsPage />
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
          <SurveyBuilderPage
            surveyId={surveyId}
            onBack={(organizationId: string) => {
              void navigate({
                to: '/clients/$orgId/overview',
                params: { orgId: organizationId },
              });
            }}
          />
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
          <UsersPage />
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
