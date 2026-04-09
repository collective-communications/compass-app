/**
 * Auth route definitions for TanStack Router.
 * Creates the `/auth` route tree for login, callback, password reset,
 * and invitation acceptance.
 */

import { useState, useEffect } from 'react';
import { createRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { PublicShell } from '../../components/shells/public-shell';
import { BrandPanel, LoginForm, ForgotPasswordForm, SocialSignOnButtons, AcceptInvitePage } from './components';
import { useAuth, usePasswordReset } from './hooks';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface LoginSearch {
  returnTo?: string;
  error?: string;
}

export interface ForgotPasswordSentSearch {
  email?: string;
}

export interface AcceptInviteSearch {
  token?: string;
}

export function createAuthRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const authRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/auth',
    component: function AuthLayout(): React.ReactElement {
      return <Outlet />;
    },
  });

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
        <PublicShell>
          <div className="flex flex-1">
            <BrandPanel />

            <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
              <div className="w-full max-w-sm">
                <h1
                  className="mb-8 text-center text-2xl font-bold text-[var(--grey-900)]"
                  style={{ fontFamily: 'var(--font-headings)' }}
                >
                  Sign in
                </h1>

                <LoginForm onSubmit={signInWithEmail} isLoading={isLoading} error={error} />
                <SocialSignOnButtons onSignIn={signInWithOAuth} isLoading={isLoading} />

                <p className="mt-4 text-center">
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm text-[var(--color-interactive)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </PublicShell>
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
            <p className="text-[var(--text-secondary)]">Authentication failed. Redirecting...</p>
          </div>
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--text-secondary)]">Completing sign-in...</p>
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
        <PublicShell>
          <div className="flex flex-1">
            <BrandPanel />

            <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
              <div className="w-full max-w-sm">
                <div className="mb-6">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-interactive)] hover:underline"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </Link>
                </div>

                <div className="mb-2 flex justify-center">
                  <Lock size={32} className="text-[var(--color-interactive)]" />
                </div>

                <h1
                  className="mb-2 text-center text-2xl font-bold text-[var(--grey-900)]"
                  style={{ fontFamily: 'var(--font-headings)' }}
                >
                  Reset your password
                </h1>
                <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                <ForgotPasswordForm onSubmit={requestReset} isLoading={isLoading} error={error} />

                <div className="mt-6 rounded-lg border border-[var(--grey-200)] bg-[var(--grey-50)] p-4">
                  <p className="mb-2 text-sm font-medium text-[var(--grey-700)]">
                    Didn&apos;t receive the email?
                  </p>
                  <ul className="list-disc pl-4 text-xs text-[var(--text-secondary)] space-y-1">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>

                <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
                  Remember your password?{' '}
                  <Link
                    to="/auth/login"
                    className="text-[var(--color-interactive)] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </PublicShell>
      );
    },
  });

  const forgotPasswordSentRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/forgot-password/sent',
    validateSearch: (search: Record<string, unknown>): ForgotPasswordSentSearch => ({
      email: typeof search.email === 'string' ? search.email : undefined,
    }),
    component: function ForgotPasswordSentPage(): React.ReactElement {
      const { email } = forgotPasswordSentRoute.useSearch() as ForgotPasswordSentSearch;

      return (
        <PublicShell>
          <div className="flex flex-1">
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
                  <p className="mb-6 text-sm text-[var(--text-secondary)]">
                    We sent a reset link to <span className="font-medium text-[var(--grey-700)]">{email}</span>
                  </p>
                )}

                <ol className="mb-8 space-y-3 text-left text-sm text-[var(--text-tertiary)]">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">1</span>
                    Check your inbox (and spam folder)
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">2</span>
                    Click the reset link in the email
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">3</span>
                    Choose a new password
                  </li>
                </ol>

                <Link
                  to="/auth/login"
                  className="inline-block text-sm text-[var(--color-interactive)] hover:underline"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          </div>
        </PublicShell>
      );
    },
  });

  const acceptInviteRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/accept-invite',
    validateSearch: (search: Record<string, unknown>): AcceptInviteSearch => ({
      token: typeof search.token === 'string' ? search.token : undefined,
    }),
    component: function AcceptInviteWrapper(): React.ReactElement {
      const { token } = acceptInviteRoute.useSearch() as AcceptInviteSearch;
      return <AcceptInvitePage token={token} />;
    },
  });

  return authRoute.addChildren([loginRoute, callbackRoute, forgotPasswordSentRoute, forgotPasswordRoute, acceptInviteRoute]);
}
