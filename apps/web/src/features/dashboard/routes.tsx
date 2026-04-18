/**
 * Dashboard route definitions for TanStack Router.
 * Creates the `/dashboard` route for Tier 2 client users.
 *
 * The dashboard page is loaded via `React.lazy` so it ships in its own chunk
 * and stays out of the initial bundle for survey respondents / unauthenticated
 * visitors.
 */

import { Suspense, lazy, type ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { RouteLoading } from '../../components/app/route-loading';
import { guardRoute } from '../../lib/route-guards';

const DashboardPage = lazy(() =>
  import('./pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);

export function createDashboardRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const dashboardRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/dashboard',
    beforeLoad: () => guardRoute('/dashboard'),
    component: function DashboardLayout(): ReactElement {
      return (
        <AppShell>
          <Suspense fallback={<RouteLoading />}>
            <DashboardPage />
          </Suspense>
        </AppShell>
      );
    },
  });

  return dashboardRoute;
}
