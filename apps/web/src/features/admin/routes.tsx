/**
 * Admin route definitions for TanStack Router.
 * Creates the `/admin` route subtree with survey management pages.
 *
 * Usage: call `createAdminRoutes(rootRoute)` and add the result to the route tree.
 */

import type { ReactElement } from 'react';
import { createRoute, Outlet, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import {
  SurveyListPage,
  SurveyBuilderPage,
  DeploymentPanel,
  ResponseTracker,
} from './surveys';
import { useDeploymentManagement } from './surveys/hooks/use-deployment-management';
import { useResponseTracking } from './surveys/hooks/use-response-tracking';
import { useRealtimeResponses } from './surveys/hooks/use-realtime-responses';
import { useSurveyBuilder } from './surveys/hooks/use-survey-builder';
import { useAuthStore } from '../../stores/auth-store';
import { ClientListPage } from './clients';
import { ClientDetailPage } from './clients/pages/client-detail-page';
import { ClientUsersTab } from './clients/components/client-users-tab';
import { OrgSettingsPage } from './clients/pages/org-settings-page';
import { SystemSettingsPage } from './settings';
import { UsersPage } from './users';

// TODO: Implement role-based route guard (admin role required).
// Should redirect non-admin users to their tier home route.

/**
 * Creates the admin route subtree.
 *
 * @param parentRoute - The root (or parent) route to attach `/admin` under.
 * @returns The admin layout route with all children attached, ready for `addChildren`.
 */
export function createAdminRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const adminLayoutRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/admin',
    component: function AdminLayout(): ReactElement {
      return (
        <AppShell>
          <Outlet />
        </AppShell>
      );
    },
  });

  const adminSurveysRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/surveys',
    component: function AdminSurveysPage(): ReactElement {
      const navigate = useNavigate();
      const user = useAuthStore((s) => s.user);

      return (
        <SurveyListPage
          organizationId={user?.tier === 'tier_1' ? '' : user?.organizationId ?? ''}
          userId={user?.id ?? ''}
          onSelectSurvey={(surveyId: string) => {
            void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId } });
          }}
        />
      );
    },
  });

  const adminSurveyBuilderRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/surveys/$surveyId',
    component: function AdminSurveyBuilderPage(): ReactElement {
      const { surveyId } = adminSurveyBuilderRoute.useParams() as { surveyId: string };
      const navigate = useNavigate();

      return (
        <SurveyBuilderPage
          surveyId={surveyId}
          onBack={() => {
            void navigate({ to: '/admin/surveys' });
          }}
        />
      );
    },
  });

  const adminSurveyDeployRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/surveys/$surveyId/deploy',
    component: function AdminSurveyDeployPage(): ReactElement {
      const { surveyId } = adminSurveyDeployRoute.useParams() as { surveyId: string };
      const { deployment, deactivate, isPending } = useDeploymentManagement({ surveyId });
      const metricsQuery = useResponseTracking({ surveyId });
      const { connectionStatus } = useRealtimeResponses({ surveyId });
      const builderQuery = useSurveyBuilder({ surveyId });

      if (deployment.isLoading || metricsQuery.isLoading || builderQuery.isLoading) {
        return (
          <div className="flex items-center justify-center py-12">
            <p className="text-[var(--grey-500)]">Loading deployment...</p>
          </div>
        );
      }

      if (!deployment.data || !builderQuery.data) {
        return (
          <div className="flex items-center justify-center py-12">
            <p className="text-[var(--grey-500)]">No active deployment found.</p>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <DeploymentPanel
            deployment={deployment.data}
            survey={builderQuery.data.survey}
            onDeactivate={() => {
              void deactivate();
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
      );
    },
  });

  const adminClientsRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/clients',
    component: function AdminClientsPage(): ReactElement {
      const navigate = useNavigate();
      return <ClientListPage onSelectClient={(orgId) => {
        void navigate({ to: '/admin/clients/$orgId', params: { orgId } });
      }} />;
    },
  });

  const adminClientDetailRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/clients/$orgId',
    component: function AdminClientDetailPage(): ReactElement {
      const { orgId } = adminClientDetailRoute.useParams() as { orgId: string };
      const navigate = useNavigate();

      return (
        <ClientDetailPage
          orgId={orgId}
          onBack={() => {
            void navigate({ to: '/admin/clients' });
          }}
        />
      );
    },
  });

  const adminClientUsersRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/clients/$orgId/users',
    component: function AdminClientUsersPage(): ReactElement {
      const { orgId } = adminClientUsersRoute.useParams() as { orgId: string };
      return <ClientUsersTab organizationId={orgId} />;
    },
  });

  const adminClientSettingsRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/clients/$orgId/settings',
    component: function AdminClientSettingsPage(): ReactElement {
      return <OrgSettingsPage />;
    },
  });

  const adminSettingsRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/settings',
    component: function AdminSettingsPage(): ReactElement {
      return <SystemSettingsPage />;
    },
  });

  const adminUsersRoute = createRoute({
    getParentRoute: () => adminLayoutRoute,
    path: '/settings/users',
    component: function AdminUsersPage(): ReactElement {
      return <UsersPage />;
    },
  });

  return adminLayoutRoute.addChildren([
    adminSurveysRoute,
    adminSurveyBuilderRoute,
    adminSurveyDeployRoute,
    adminClientsRoute,
    adminClientDetailRoute,
    adminClientUsersRoute,
    adminClientSettingsRoute,
    adminSettingsRoute,
    adminUsersRoute,
  ]);
}
