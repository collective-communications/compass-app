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
          organizationId={user?.organizationId ?? ''}
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
      const { surveyId } = adminSurveyBuilderRoute.useParams();
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
      const { surveyId } = adminSurveyDeployRoute.useParams();
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

  return adminLayoutRoute.addChildren([
    adminSurveysRoute,
    adminSurveyBuilderRoute,
    adminSurveyDeployRoute,
  ]);
}
