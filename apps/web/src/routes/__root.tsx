import { lazy, Suspense, useEffect, useRef } from 'react';
import { createRootRoute, createRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { createResultsRoutes } from '../features/results/routes';
import { createAdminRoutes } from '../features/admin/routes';
import { createDashboardRoutes } from '../features/dashboard/routes';
import { createReportsRoutes } from '../features/reports/routes';
import { createSurveyRoutes } from '../features/survey/routes';
import { createAuthRoutes } from '../features/auth/routes';
import { createSettingsRoutes } from '../features/settings/routes';
import { createHelpRoutes } from '../features/help/routes';
import { createProfileRoutes } from '../features/profile/routes';
import { PublicShell } from '../components/shells/public-shell';
import { useAuthStore } from '../stores/auth-store';
import { captureRouteView } from '../lib/analytics';


const rootRoute = createRootRoute({
  component: function RootLayout(): React.ReactElement {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const user = useAuthStore((state) => state.user);
    const lastCapturedPathRef = useRef<string | null>(null);

    useEffect(() => {
      if (lastCapturedPathRef.current === pathname) return;
      lastCapturedPathRef.current = pathname;
      captureRouteView(pathname, user);
    }, [pathname, user]);

    return <Outlet />;
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function IndexPage(): React.ReactElement {
    return (
      <PublicShell>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-xl flex-col items-center text-center">
            <img
          src="/compass-brand-panel-dark.svg"
          alt="The Collective Culture Compass"
          className="mb-6 h-28 w-28"
        />
            <h1
              className="mb-3 text-3xl font-bold text-[var(--grey-900)] sm:text-4xl"
              style={{ fontFamily: 'var(--font-headings)' }}
            >
              The Collective Culture Compass&#8482;
            </h1>
            <p className="mb-2 text-sm font-semibold tracking-wide text-[var(--grey-700)]">
              YOUR PEOPLE. YOUR STORY.
            </p>
            <p className="mb-8 text-base text-[var(--text-secondary)]">
              Know where your culture stands. Navigate where you&rsquo;re going.
            </p>
            <Link
              to="/auth/login"
              className="inline-block rounded-lg bg-[var(--color-interactive)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        </div>
      </PublicShell>
    );
  },
});

/* ── Feature route trees ──────────────────────────────────────── */

const surveyRoutes = createSurveyRoutes(rootRoute);
const authRoutes = createAuthRoutes(rootRoute);
const resultsRoutes = createResultsRoutes(rootRoute);
const adminRoutes = createAdminRoutes(rootRoute);
const dashboardRoutes = createDashboardRoutes(rootRoute);
const reportsRoutes = createReportsRoutes(rootRoute);
const settingsRoutes = createSettingsRoutes(rootRoute);
const helpRoutes = createHelpRoutes(rootRoute);
const profileRoutes = createProfileRoutes(rootRoute);

/* ── Dev routes (excluded from production builds) ─────────────── */

const devRoutes = import.meta.env.DEV
  ? (
    // The route type is intentionally inferred so TanStack keeps the exact
    // parent/child generics for `routeTree.addChildren`.
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    () => {
      const LazyScoringValidator = lazy(async () => {
        const { ScoringValidator } = await import('@compass/scoring-validator');
        return { default: ScoringValidator };
      });

      return [
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/dev/scoring',
          component: function ScoringValidatorDevRoute(): React.ReactElement {
            return (
              <Suspense
                fallback={
                  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                    Loading scoring validator...
                  </div>
                }
              >
                <LazyScoringValidator />
              </Suspense>
            );
          },
        }),
      ];
    })()
  : [];

/* ── Not Found ─────────────────────────────────────────────────── */

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: function NotFoundPage(): React.ReactElement {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>404</h1>
          <p style={{ color: 'var(--grey-500)' }}>Page not found</p>
        </div>
      </div>
    );
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  surveyRoutes,
  authRoutes,
  resultsRoutes,
  ...adminRoutes,
  dashboardRoutes,
  reportsRoutes,
  settingsRoutes,
  helpRoutes,
  profileRoutes,
  ...devRoutes,
  notFoundRoute,
]);
