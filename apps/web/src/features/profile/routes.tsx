import type { ReactElement } from 'react';
import { createRoute } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { AppShell } from '../../components/shells/app-shell';
import { guardRoute } from '../../lib/route-guards';
import { ProfilePage } from './pages/profile-page';

export function createProfileRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/profile',
    beforeLoad: () => guardRoute('/profile'),
    component: function ProfileLayout(): ReactElement {
      return (
        <AppShell>
          <ProfilePage />
        </AppShell>
      );
    },
  });
}
