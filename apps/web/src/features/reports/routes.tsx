/**
 * Reports route definitions for TanStack Router.
 * Creates the `/reports/$surveyId` route for Tier 2 client users.
 */

import type { ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { ReportsPage } from './pages/reports-page';

export function createReportsRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const reportsRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/reports/$surveyId',
    component: function ReportsLayout(): ReactElement {
      const { surveyId } = reportsRoute.useParams();
      return (
        <AppShell>
          <ReportsPage
            userRole="client_exec"
            surveys={[]}
            initialSurveyId={surveyId}
          />
        </AppShell>
      );
    },
  });

  return reportsRoute;
}
