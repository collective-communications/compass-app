/**
 * Reports route definitions for TanStack Router.
 * Creates the `/reports/$surveyId` route for Tier 2 client users.
 *
 * beforeLoad guard:
 *   - No user → redirect to /auth/login
 *   - tier_1 → always allowed
 *   - tier_2 → requires `organization_settings.client_access_enabled`
 *     (delegated to `guardClientAccess`)
 *
 * The `ReportsPage` is loaded via `React.lazy` so its report rendering /
 * PDF generation footprint stays out of the initial bundle.
 */

import { Suspense, lazy, type ReactElement } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { UserRole } from '@compass/types';
import { useAuthStore } from '../../stores/auth-store';
import { guardClientAccess } from '../../lib/route-guards';
import { AppShell } from '../../components/shells/app-shell';
import { RouteLoading } from '../../components/app/route-loading';
import { useScoredSurveys } from '../../hooks/use-scored-surveys';

const ReportsPage = lazy(() =>
  import('./pages/reports-page').then((m) => ({ default: m.ReportsPage })),
);

/**
 * Narrowed role shape accepted by `ReportsPage`. Determines whether the
 * "Generate Report" button appears — only `client_exec` can generate.
 */
type ReportsPageRole = 'client_exec' | 'director' | 'manager';

/**
 * Exhaustive mapping from platform `UserRole` to the narrowed role
 * `ReportsPage` understands. TypeScript enforces every role is mapped;
 * adding a new role without updating this table is a compile error.
 *
 * tier_1 (ccc_admin/ccc_member) gets `client_exec` so generate is available
 * when they visit a client's reports; client_user has no generate capability
 * so we treat them like a manager.
 */
const ROLE_TO_REPORTS_PAGE_ROLE: Record<UserRole, ReportsPageRole> = {
  ccc_admin: 'client_exec',
  ccc_member: 'client_exec',
  client_exec: 'client_exec',
  client_director: 'director',
  client_manager: 'manager',
  client_user: 'manager',
};

/** Map platform role to the narrowed ReportsPage role. */
function mapUserRole(role: UserRole): ReportsPageRole {
  return ROLE_TO_REPORTS_PAGE_ROLE[role];
}

export function createReportsRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const reportsRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/reports/$surveyId',
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
    component: function ReportsLayout(): ReactElement {
      const { surveyId } = reportsRoute.useParams() as { surveyId: string };
      const user = useAuthStore((s) => s.user);
      const organizationId = user?.organizationId ?? '';
      const { data: scoredSurveys = [], isLoading: isSurveysLoading } = useScoredSurveys(organizationId);

      const surveys = scoredSurveys.map((s) => ({
        id: s.id,
        title: s.title,
        closedAt: s.closedAt,
      }));

      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <ReportsPage
              userRole={mapUserRole(user?.role ?? UserRole.CLIENT_EXEC)}
              surveys={surveys}
              isSurveysLoading={isSurveysLoading}
              initialSurveyId={surveyId}
            />
          </Suspense>
        </AppShell>
      );
    },
  });

  return reportsRoute;
}
