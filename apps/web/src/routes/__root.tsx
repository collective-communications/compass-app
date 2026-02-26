import { useEffect, useState } from 'react';
import { createRootRoute, createRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { SurveyShell } from '../shells/survey';
import { AppShell } from '../components/shells/app-shell';
import { BrandPanel, LoginForm, ForgotPasswordForm, SocialSignOnButtons } from '../features/auth/components';
import { useAuth, usePasswordReset } from '../features/auth/hooks';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const rootRoute = createRootRoute({
  component: function RootLayout(): React.ReactElement {
    return <Outlet />;
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function IndexPage(): React.ReactElement {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Culture Compass</h1>
          <p style={{ color: 'var(--grey-500)' }}>COLLECTIVE culture + communication</p>
        </div>
      </div>
    );
  },
});

const surveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$token',
  component: function SurveyPage(): React.ReactElement {
    return (
      <SurveyShell orgName="Test Organization">
        <div className="flex items-center justify-center py-12">
          <p className="text-[var(--grey-500)]">Survey Loading...</p>
        </div>
      </SurveyShell>
    );
  },
});

/* ── Auth routes ───────────────────────────────────────────────── */

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: function AuthLayout(): React.ReactElement {
    return <Outlet />;
  },
});

export interface LoginSearch {
  returnTo?: string;
  error?: string;
}

const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: function LoginPage(): React.ReactElement {
    const { isLoading, error, signInWithEmail, signInWithOAuth } = useAuth();

    return (
      <div className="flex min-h-screen">
        <BrandPanel />

        <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
          <div className="w-full max-w-sm">
            <h1
              className="mb-8 text-center text-2xl font-bold text-[var(--grey-900)]"
              style={{ fontFamily: 'var(--font-headings)' }}
            >
              Sign in
            </h1>

            <SocialSignOnButtons onSignIn={signInWithOAuth} isLoading={isLoading} />
            <LoginForm onSubmit={signInWithEmail} isLoading={isLoading} error={error} />

            <p className="mt-4 text-center">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-[var(--color-core)] hover:underline"
              >
                Forgot your password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  },
});

const callbackRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/callback',
  component: function AuthCallbackPage(): React.ReactElement {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
      async function handleCallback(): Promise<void> {
        // Check for error in URL hash params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlError = hashParams.get('error_description') ?? hashParams.get('error');

        if (urlError) {
          await navigate({
            to: '/auth/login',
            search: { error: urlError },
          });
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          await navigate({
            to: '/auth/login',
            search: { error: 'Authentication failed. Please try again.' },
          });
          return;
        }

        const userId = sessionData.session.user.id;
        const { data: member } = await supabase
          .from('org_members')
          .select('role')
          .eq('user_id', userId)
          .single();

        const role: UserRole = (member?.role as UserRole) ?? 'client_user';
        const tier = getTierFromRole(role);
        await navigate({ to: getTierHomeRoute(tier) });
      }

      handleCallback().catch(() => {
        setStatus('error');
      });
    }, [navigate]);

    if (status === 'error') {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--grey-500)]">Authentication failed. Redirecting...</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--grey-500)]">Completing sign-in...</p>
      </div>
    );
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/forgot-password',
  component: function ForgotPasswordPage(): React.ReactElement {
    const { requestReset, isLoading, error } = usePasswordReset();

    return (
      <div className="flex min-h-screen">
        <BrandPanel />

        <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1 text-sm text-[var(--color-core)] hover:underline"
              >
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </div>

            <div className="mb-2 flex justify-center">
              <Mail size={32} className="text-[var(--color-core)]" />
            </div>

            <h1
              className="mb-2 text-center text-2xl font-bold text-[var(--grey-900)]"
              style={{ fontFamily: 'var(--font-headings)' }}
            >
              Reset your password
            </h1>
            <p className="mb-8 text-center text-sm text-[var(--grey-500)]">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <ForgotPasswordForm onSubmit={requestReset} isLoading={isLoading} error={error} />
          </div>
        </div>
      </div>
    );
  },
});

export interface ForgotPasswordSentSearch {
  email?: string;
}

const forgotPasswordSentRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/forgot-password/sent',
  validateSearch: (search: Record<string, unknown>): ForgotPasswordSentSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: function ForgotPasswordSentPage(): React.ReactElement {
    const { email } = forgotPasswordSentRoute.useSearch();

    return (
      <div className="flex min-h-screen">
        <BrandPanel />

        <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
          <div className="w-full max-w-sm text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle size={40} className="text-[var(--color-connection)]" />
            </div>

            <h1
              className="mb-2 text-2xl font-bold text-[var(--grey-900)]"
              style={{ fontFamily: 'var(--font-headings)' }}
            >
              Check your email
            </h1>

            {email && (
              <p className="mb-6 text-sm text-[var(--grey-500)]">
                We sent a reset link to <span className="font-medium text-[var(--grey-700)]">{email}</span>
              </p>
            )}

            <ol className="mb-8 space-y-3 text-left text-sm text-[var(--grey-600)]">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">1</span>
                Open the email from Culture Compass
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">2</span>
                Click the reset link
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">3</span>
                Choose a new password
              </li>
            </ol>

            <Link
              to="/auth/login"
              className="inline-block text-sm text-[var(--color-core)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  },
});

/* ── Authenticated routes ──────────────────────────────────────── */

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients',
  component: function ClientsPage(): React.ReactElement {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-[var(--grey-500)]">Clients — coming soon</p>
        </div>
      </AppShell>
    );
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: function DashboardPage(): React.ReactElement {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-[var(--grey-500)]">Dashboard — coming soon</p>
        </div>
      </AppShell>
    );
  },
});

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
  surveyRoute,
  authRoute.addChildren([loginRoute, callbackRoute, forgotPasswordSentRoute, forgotPasswordRoute]),
  clientsRoute,
  dashboardRoute,
  notFoundRoute,
]);
