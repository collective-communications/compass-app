/**
 * Accept-invite page component.
 * Validates an invitation token and presents a signup form for new users.
 */

import { useId, type ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { PublicShell } from '../../../components/shells/public-shell';
import { BrandPanel } from './brand-panel';
import { useInvitationFlow } from '../hooks/use-invitation-flow';

interface AcceptInvitePageProps {
  token: string | undefined;
}

export function AcceptInvitePage({ token }: AcceptInvitePageProps): ReactElement {
  const errorId = useId();
  const {
    status,
    invitation,
    fullName,
    setFullName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    formError,
    isExistingUser,
    canSubmit,
    passwordRef,
    handleSubmit,
  } = useInvitationFlow(token);

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
                className="text-sm text-[var(--color-interactive)] hover:underline"
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
                className="text-sm text-[var(--color-interactive)] hover:underline"
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
                className="inline-block rounded-lg bg-[var(--color-interactive)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90"
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
              <UserPlus size={32} className="text-[var(--color-interactive)]" />
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
                  className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="w-full rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 pr-10 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Re-enter your password"
                />
                {confirmPassword !== '' && password !== confirmPassword && (
                  <p className="text-xs text-[var(--feedback-error-text)]">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                aria-describedby={formError ? errorId : undefined}
                className="mt-2 rounded-lg bg-[var(--color-interactive)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Creating account\u2026' : 'Create Account'}
              </button>

              {formError && (
                <p id={errorId} role="alert" className="text-center text-sm text-[var(--feedback-error-text)]">
                  {formError}
                </p>
              )}
            </form>

            <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
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
}
