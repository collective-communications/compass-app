/**
 * Auth route definitions for TanStack Router.
 * Creates the `/auth` route tree for login, callback, password reset,
 * and invitation acceptance.
 *
 * ## Code splitting
 *
 * Login is the most common entry point and stays eager so the first paint
 * has no Suspense flash. `AcceptInvitePage` — an occasional deep link path
 * new users follow once — is lazy-loaded to keep its weight off the initial
 * bundle.
 */

import { Suspense, lazy, useState, useEffect } from 'react';
import { createRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { PublicShell } from '../../components/shells/public-shell';
import { BrandPanel, LoginForm, ForgotPasswordForm, ResetPasswordForm, SocialSignOnButtons } from './components';
import { RouteLoading } from '../../components/app/route-loading';
import { useAuth, usePasswordReset, useResetPassword } from './hooks';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AcceptInvitePage = lazy(() =>
  import('./components/accept-invite-page').then((m) => ({ default: m.AcceptInvitePage })),
);

export interface LoginSearch {
  returnTo?: string;
  error?: string;
  /** 1 when the user just reset their password — shows a success banner. */
  passwordReset?: number;
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
      passwordReset: search.passwordReset === 1 || search.passwordReset === '1' ? 1 : undefined,
    }),
    component: function LoginPage(): React.ReactElement {
      const { isLoading, error, signInWithEmail, signInWithOAuth } = useAuth();
      const { passwordReset } = loginRoute.useSearch() as LoginSearch;

      return (
        <PublicShell>
          <div className="flex flex-1">
            <BrandPanel />

            <div className="flex w-full items-center justify-center bg-[var(--surface-card)] px-6 lg:w-1/2">
              <div className="w-full max-w-sm">
                <h1
                  className="mb-8 text-center text-2xl font-bold text-[var(--grey-900)]"
                  style={{ fontFamily: 'var(--font-headings)' }}
                >
                  Sign in
                </h1>

                {passwordReset === 1 && (
                  <div
                    role="status"
                    className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--feedback-success-border,#a7d3a7)] bg-[var(--feedback-success-bg,#ecf7ec)] p-3 text-sm text-[var(--feedback-success-text,#1f5f1f)]"
                  >
                    <CheckCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>Password updated. Sign in with your new credentials.</span>
                  </div>
                )}

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

            <div className="flex w-full items-center justify-center bg-[var(--surface-card)] px-6 lg:w-1/2">
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

                <div className="mt-6 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-4">
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

            <div className="flex w-full items-center justify-center bg-[var(--surface-card)] px-6 lg:w-1/2">
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

  const resetPasswordRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/reset-password',
    component: function ResetPasswordPage(): React.ReactElement {
      const { isCheckingSession, hasRecoverySession, submit, isLoading, error } = useResetPassword();

      return (
        <PublicShell>
          <div className="flex flex-1">
            <BrandPanel />

            <div className="flex w-full items-center justify-center bg-[var(--surface-card)] px-6 lg:w-1/2">
              <div className="w-full max-w-sm">
                <div className="mb-2 flex justify-center">
                  <Lock size={32} className="text-[var(--color-interactive)]" />
                </div>

                <h1
                  className="mb-2 text-center text-2xl font-bold text-[var(--grey-900)]"
                  style={{ fontFamily: 'var(--font-headings)' }}
                >
                  Choose a new password
                </h1>

                {isCheckingSession ? (
                  <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                    Verifying reset link…
                  </p>
                ) : hasRecoverySession ? (
                  <>
                    <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
                      Enter a new password for your account.
                    </p>
                    <ResetPasswordForm onSubmit={submit} isLoading={isLoading} error={error} />
                  </>
                ) : (
                  <>
                    <p className="mb-6 text-center text-sm text-[var(--feedback-error-text)]">
                      This reset link has expired.
                    </p>
                    <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
                      Reset links are valid for a limited time. Request a new link to continue.
                    </p>
                    <div className="flex flex-col gap-3 text-center">
                      <Link
                        to="/auth/forgot-password"
                        className="rounded-lg bg-[var(--color-navy-teal)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-navy-teal)]/90"
                      >
                        Request a new reset link
                      </Link>
                      <Link
                        to="/auth/login"
                        className="inline-flex items-center justify-center gap-1 text-sm text-[var(--color-interactive)] hover:underline"
                      >
                        <ArrowLeft size={16} />
                        Back to sign in
                      </Link>
                    </div>
                  </>
                )}
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
      return (
        <Suspense fallback={<RouteLoading />}>
          <AcceptInvitePage token={token} />
        </Suspense>
      );
    },
  });

  return authRoute.addChildren([loginRoute, callbackRoute, forgotPasswordSentRoute, forgotPasswordRoute, resetPasswordRoute, acceptInviteRoute]);
}
