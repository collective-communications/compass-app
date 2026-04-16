/**
 * Dashboard route definitions for TanStack Router.
 * Creates the `/dashboard` route for Tier 2 client users.
 */

import type { ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { guardRoute } from '../../lib/route-guards';
import { DashboardPage } from './pages/dashboard-page';

export function createDashboardRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const dashboardRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/dashboard',
    beforeLoad: () => guardRoute('/dashboard'),
    component: function DashboardLayout(): ReactElement {
      return (
        <AppShell>
          <DashboardPage />
        </AppShell>
      );
    },
  });

  return dashboardRoute;
}
