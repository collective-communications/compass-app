import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../../../lib/supabase';

/**
 * Captured at module load — BEFORE Supabase's auth client has an opportunity
 * to consume and clear the URL hash. Supabase-JS reads the recovery tokens
 * asynchronously on its own instantiation and removes the hash; by the time
 * React renders our component the hash can already be gone. Reading it at
 * module-evaluation time side-steps that race.
 *
 * Only trusted as a "recovery flow intended" signal — Supabase still
 * validates the tokens server-side when we call `updateUser`, so a forged
 * hash gets a real error, not a silent pass-through.
 */
const RECOVERY_HASH_ON_LOAD =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.hash.substring(1)).get('type') === 'recovery';

interface UseResetPasswordReturn {
  /** True while we're checking whether Supabase created a recovery session on mount. */
  isCheckingSession: boolean;
  /**
   * True once we know the recovery session is usable. When false AND `isCheckingSession`
   * is also false, the user followed an expired / invalid link — render the expired state.
   */
  hasRecoverySession: boolean;
  /** Submit handler — passes the new password through to Supabase and redirects on success. */
  submit: (newPassword: string) => Promise<void>;
  /** Submit in flight. */
  isLoading: boolean;
  /** Inline error from the last submit attempt. Cleared on the next submit. */
  error: string | null;
}

/**
 * Drives the password-reset form rendered at `/auth/reset-password`.
 *
 * Flow:
 *  1. Supabase-JS auto-consumes the recovery tokens from the URL hash and
 *     fires `onAuthStateChange('PASSWORD_RECOVERY')`. On mount we call
 *     `getSession()` to confirm a session now exists — that's our signal
 *     the recovery link was valid.
 *  2. User fills the form. On submit we call `supabase.auth.updateUser`
 *     which consumes the recovery session and persists the new password.
 *  3. We immediately sign out to clear the recovery session, then navigate
 *     to `/auth/login?passwordReset=1` so the user logs in fresh with the
 *     new credentials. The login page reads the flag and shows a banner.
 *
 * If a user lands on `/auth/reset-password` without a recovery session —
 * typed the URL manually, link expired, Supabase rejected the token — we
 * surface `hasRecoverySession=false` so the caller can render the expired
 * copy + a link back to `/auth/forgot-password`.
 */
export function useResetPassword(): UseResetPasswordReturn {
  // Seed from the module-load hash check — if the user arrived via a proper
  // recovery link we don't need to wait for the PASSWORD_RECOVERY event.
  const [isCheckingSession, setIsCheckingSession] = useState(!RECOVERY_HASH_ON_LOAD);
  const [hasRecoverySession, setHasRecoverySession] = useState(RECOVERY_HASH_ON_LOAD);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If the module-load hash check already flagged recovery, no subscription
    // is needed — we're done. Otherwise listen for PASSWORD_RECOVERY in case
    // Supabase processes the hash after mount (rare edge; SDK normally beats
    // this effect), and close the grace window shortly after so a stale URL
    // without a recovery hash surfaces the expired state rather than hanging.
    if (RECOVERY_HASH_ON_LOAD) return;

    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true);
        setIsCheckingSession(false);
      }
    });

    const graceTimer = window.setTimeout(() => {
      if (cancelled) return;
      setIsCheckingSession(false);
    }, 750);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(graceTimer);
    };
  }, []);

  const submit = useCallback(async (newPassword: string): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        // Supabase surfaces a typed message for "same as current" / weak-password rejections.
        const msg = updateError.message ?? '';
        if (/same.*password|should be different/i.test(msg)) {
          setError('New password must be different from your current password.');
        } else if (/weak|at least|minimum/i.test(msg)) {
          setError(msg);
        } else if (/rate|too many/i.test(msg)) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (/network|fetch/i.test(msg)) {
          setError('Unable to connect. Please try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Clear the recovery session so the user logs in fresh — proves the
      // new password works and matches expected UX.
      await supabase.auth.signOut();
      await navigate({ to: '/auth/login', search: { passwordReset: 1 } });
    } catch {
      setError('Unable to connect. Please try again.');
      setIsLoading(false);
    }
  }, [navigate]);

  return { isCheckingSession, hasRecoverySession, submit, isLoading, error };
}
