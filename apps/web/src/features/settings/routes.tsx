/**
 * Top-level `/settings` route. ALL_ROLES — tier dispatch happens inside the
 * page component, not at the router.
 */

import type { ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { guardRoute } from '../../lib/route-guards';
import { SettingsPage } from './pages/settings-page';

export function createSettingsRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/settings',
    beforeLoad: () => guardRoute('/settings'),
    component: function SettingsLayout(): ReactElement {
      return (
        <AppShell>
          <SettingsPage />
        </AppShell>
      );
    },
  });
}
