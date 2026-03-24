/**
 * Auth route definitions for TanStack Router.
 * Creates the `/auth` route tree for login, callback, password reset,
 * and invitation acceptance.
 */

import { useState, useEffect, useId, useRef, useCallback } from 'react';
import { createRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { PublicShell } from '../../components/shells/public-shell';
import { BrandPanel, LoginForm, ForgotPasswordForm, SocialSignOnButtons } from './components';
import { useAuth, usePasswordReset } from './hooks';
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { optionalEnv } from '@compass/utils';

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

interface InvitationDetails {
  email: string;
  role: string;
  roleLabel: string;
  organizationName: string | null;
  expiresAt: string;
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
                    className="text-sm text-[var(--color-core-text)] hover:underline"
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
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-core-text)] hover:underline"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </Link>
                </div>

                <div className="mb-2 flex justify-center">
                  <Lock size={32} className="text-[var(--color-core-text)]" />
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
                    className="text-[var(--color-core-text)] hover:underline"
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
                  className="inline-block text-sm text-[var(--color-core-text)] hover:underline"
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
    component: function AcceptInvitePage(): React.ReactElement {
      const { token } = acceptInviteRoute.useSearch() as AcceptInviteSearch;
      const navigate = useNavigate();
      const errorId = useId();

      const [status, setStatus] = useState<'loading' | 'invalid' | 'expired' | 'ready' | 'submitting' | 'success' | 'error'>('loading');
      const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
      const [fullName, setFullName] = useState('');
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [formError, setFormError] = useState<string | null>(null);
      const [isExistingUser, setIsExistingUser] = useState(false);
      const passwordRef = useRef<HTMLInputElement>(null);

      // Validate the invitation token on mount
      useEffect(() => {
        if (!token) {
          setStatus('invalid');
          return;
        }

        async function validateToken(): Promise<void> {
          try {
            const supabaseUrl = optionalEnv('VITE_SUPABASE_URL', '');
            const anonKey = optionalEnv('VITE_SUPABASE_ANON_KEY', '');
            const response = await fetch(
              `${supabaseUrl}/functions/v1/accept-invitation?token=${token}`,
              {
                headers: {
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
              },
            );

            const result = await response.json();

            if (!response.ok) {
              if (result.error === 'EXPIRED_INVITATION') {
                setStatus('expired');
              } else {
                setStatus('invalid');
              }
              return;
            }

            setInvitation({
              email: result.email,
              role: result.role,
              roleLabel: result.roleLabel,
              organizationName: result.organizationName,
              expiresAt: result.expiresAt,
            });
            setStatus('ready');
          } catch {
            setStatus('invalid');
          }
        }

        validateToken();
      }, [token]);

      const handleSubmit = useCallback(
        async (e: React.FormEvent): Promise<void> => {
          e.preventDefault();
          setFormError(null);

          if (!fullName.trim()) {
            setFormError('Full name is required.');
            return;
          }

          if (password.length < 8) {
            setFormError('Password must be at least 8 characters.');
            passwordRef.current?.focus();
            return;
          }

          if (password !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
          }

          setStatus('submitting');

          try {
            const supabaseUrl = optionalEnv('VITE_SUPABASE_URL', '');
            const anonKey = optionalEnv('VITE_SUPABASE_ANON_KEY', '');
            const response = await fetch(
              `${supabaseUrl}/functions/v1/accept-invitation`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  invitationId: token,
                  password,
                  fullName: fullName.trim(),
                }),
              },
            );

            const result = await response.json();

            if (!response.ok) {
              setFormError(result.message ?? 'Failed to create account. Please try again.');
              setStatus('ready');
              return;
            }

            setIsExistingUser(result.isExistingUser);

            // Auto-sign in with the new credentials
            if (!result.isExistingUser) {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: invitation!.email,
                password,
              });

              if (signInError || !signInData.user) {
                // Account created but auto-sign-in failed — redirect to login
                setStatus('success');
                return;
              }

              // Navigate to the appropriate tier
              const { data: member } = await supabase
                .from('org_members')
                .select('role')
                .eq('user_id', signInData.user.id)
                .single();

              const role: UserRole = (member?.role as UserRole) ?? 'client_user';
              const tier = getTierFromRole(role);
              await navigate({ to: getTierHomeRoute(tier) });
            } else {
              // Existing user — they need to sign in with their current password
              setStatus('success');
            }
          } catch {
            setFormError('Unable to connect. Please try again.');
            setStatus('ready');
          }
        },
        [token, fullName, password, confirmPassword, invitation, navigate],
      );

      const isReady = status === 'ready';
      const canSubmit = fullName.trim() !== '' && password.length >= 8 && password === confirmPassword && isReady;

      // Loading state
      if (status === 'loading') {
        return (
          <PublicShell>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[var(--text-secondary)]">Validating invitation...</p>
            </div>
          </PublicShell>
        );
      }

      // Invalid invitation
      if (status === 'invalid') {
        return (
          <PublicShell>
            <div className="flex flex-1">
              <BrandPanel />
              <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
                <div className="w-full max-w-sm text-center">
                  <h1
                    className="mb-4 text-2xl font-bold text-[var(--grey-900)]"
                    style={{ fontFamily: 'var(--font-headings)' }}
                  >
                    Invalid invitation
                  </h1>
                  <p className="mb-6 text-sm text-[var(--text-secondary)]">
                    This invitation link is not valid. It may have already been used or revoked.
                  </p>
                  <Link
                    to="/auth/login"
                    className="text-sm text-[var(--color-core-text)] hover:underline"
                  >
                    Go to sign in
                  </Link>
                </div>
              </div>
            </div>
          </PublicShell>
        );
      }

      // Expired invitation
      if (status === 'expired') {
        return (
          <PublicShell>
            <div className="flex flex-1">
              <BrandPanel />
              <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
                <div className="w-full max-w-sm text-center">
                  <h1
                    className="mb-4 text-2xl font-bold text-[var(--grey-900)]"
                    style={{ fontFamily: 'var(--font-headings)' }}
                  >
                    Invitation expired
                  </h1>
                  <p className="mb-6 text-sm text-[var(--text-secondary)]">
                    This invitation has expired. Please ask your administrator to send a new one.
                  </p>
                  <Link
                    to="/auth/login"
                    className="text-sm text-[var(--color-core-text)] hover:underline"
                  >
                    Go to sign in
                  </Link>
                </div>
              </div>
            </div>
          </PublicShell>
        );
      }

      // Success (existing user who needs to sign in)
      if (status === 'success') {
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
                    {isExistingUser ? 'Invitation accepted' : 'Account created'}
                  </h1>
                  <p className="mb-6 text-sm text-[var(--text-secondary)]">
                    {isExistingUser
                      ? 'Your access has been updated. Sign in with your existing password.'
                      : 'Your account has been created. Sign in to get started.'}
                  </p>
                  <Link
                    to="/auth/login"
                    className="inline-block rounded-lg bg-[var(--color-core)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </PublicShell>
        );
      }

      // Ready / Submitting — show the signup form
      return (
        <PublicShell>
          <div className="flex flex-1">
            <BrandPanel />

            <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
              <div className="w-full max-w-sm">
                <div className="mb-2 flex justify-center">
                  <UserPlus size={32} className="text-[var(--color-core-text)]" />
                </div>

                <h1
                  className="mb-2 text-center text-2xl font-bold text-[var(--grey-900)]"
                  style={{ fontFamily: 'var(--font-headings)' }}
                >
                  Create your account
                </h1>

                {invitation && (
                  <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
                    You&apos;ve been invited as <span className="font-medium text-[var(--grey-700)]">{invitation.roleLabel}</span>
                    {invitation.organizationName && (
                      <> for <span className="font-medium text-[var(--grey-700)]">{invitation.organizationName}</span></>
                    )}
                  </p>
                )}

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                  {/* Email (read-only) */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-email" className="text-sm font-medium text-[var(--grey-700)]">
                      Email
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={invitation?.email ?? ''}
                      disabled
                      className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-100)] px-3 py-2.5 text-sm text-[var(--grey-600)] cursor-not-allowed"
                    />
                  </div>

                  {/* Full name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-fullname" className="text-sm font-medium text-[var(--grey-700)]">
                      Full name
                    </label>
                    <input
                      id="invite-fullname"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={status === 'submitting'}
                      className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-password" className="text-sm font-medium text-[var(--grey-700)]">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="invite-password"
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={status === 'submitting'}
                        className="w-full rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 pr-10 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="invite-confirm-password" className="text-sm font-medium text-[var(--grey-700)]">
                      Confirm password
                    </label>
                    <input
                      id="invite-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={status === 'submitting'}
                      className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Re-enter your password"
                    />
                    {confirmPassword !== '' && password !== confirmPassword && (
                      <p className="text-xs text-red-700">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    aria-describedby={formError ? errorId : undefined}
                    className="mt-2 rounded-lg bg-[var(--color-core)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === 'submitting' ? 'Creating account\u2026' : 'Create Account'}
                  </button>

                  {formError && (
                    <p id={errorId} role="alert" className="text-center text-sm text-red-700">
                      {formError}
                    </p>
                  )}
                </form>

                <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
                  Already have an account?{' '}
                  <Link
                    to="/auth/login"
                    className="text-[var(--color-core-text)] hover:underline"
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

  return authRoute.addChildren([loginRoute, callbackRoute, forgotPasswordSentRoute, forgotPasswordRoute, acceptInviteRoute]);
}
