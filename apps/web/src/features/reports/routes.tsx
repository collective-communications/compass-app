/**
 * Reports route definitions for TanStack Router.
 * Creates the `/reports/$surveyId` route for Tier 2 client users.
 *
 * beforeLoad guard:
 *   - No user → redirect to /auth/login
 *   - tier_1 → always allowed
 *   - tier_2 → requires organizations.client_access_enabled
 */

import type { ReactElement } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/auth-store';
import { supabase } from '../../lib/supabase';
import { AppShell } from '../../components/shells/app-shell';
import { ReportsPage } from './pages/reports-page';
import { useScoredSurveys } from '../results/hooks/use-scored-surveys';

/** Map internal roles to the UserRole type expected by ReportsPage. */
function mapUserRole(role: string): 'client_exec' | 'director' | 'manager' {
  if (role === 'director') return 'director';
  if (role === 'manager') return 'manager';
  return 'client_exec';
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
      const { data } = await supabase
        .from('organizations')
        .select('client_access_enabled')
        .eq('id', user.organizationId)
        .single();
      if (!data?.client_access_enabled) {
        throw redirect({ to: '/dashboard' });
      }
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
          <ReportsPage
            userRole={mapUserRole(user?.role ?? 'client_exec')}
            surveys={surveys}
            isSurveysLoading={isSurveysLoading}
            initialSurveyId={surveyId}
          />
        </AppShell>
      );
    },
  });

  return reportsRoute;
}
