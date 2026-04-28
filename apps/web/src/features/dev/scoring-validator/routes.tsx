import { createRoute, type AnyRoute } from '@tanstack/react-router';
import { ScoringValidator } from './ScoringValidator.js';

/**
 * Create the `/dev/scoring` route.
 *
 * Accepts a parent route to keep this module decoupled from the root route.
 * No `beforeLoad` guard — the route is only registered in development builds
 * via the `import.meta.env.DEV` conditional in `__root.tsx`.
 *
 * @param parentRoute - The route under which `/dev/scoring` should be nested.
 */
export function createScoringValidatorRoutes<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/dev/scoring',
    component: ScoringValidator,
  });
}
