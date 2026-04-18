import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import type { AuthUser } from '@compass/types';
import { useAuthStore } from '../stores/auth-store';

/**
 * Returns the authenticated user, redirecting to `/auth/login` if the auth
 * store has initialized and no user is present.
 *
 * @returns The current {@link AuthUser}, or `null` while the auth store is
 * still initializing or while the redirect is in flight.
 *
 * @remarks
 * Side effect: issues a navigation to `/auth/login` with a `returnTo` search
 * param set to the current pathname. The redirect only fires once
 * `isInitialized === true`, so pre-hydration renders do not bounce the user.
 * Callers receiving `null` should render a loading/null state rather than
 * accessing user fields.
 */
export function useRequireAuth(): AuthUser | null {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && !user) {
      navigate({ to: '/auth/login', search: { returnTo: window.location.pathname } });
    }
  }, [isInitialized, user, navigate]);

  return user;
}
