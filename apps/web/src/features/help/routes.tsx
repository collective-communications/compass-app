import type { ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { guardRoute } from '../../lib/route-guards';
import { HelpPage } from './pages/help-page';

export function createHelpRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/help',
    beforeLoad: () => guardRoute('/help'),
    component: function HelpLayout(): ReactElement {
      return (
        <AppShell>
          <HelpPage />
        </AppShell>
      );
    },
  });
}
