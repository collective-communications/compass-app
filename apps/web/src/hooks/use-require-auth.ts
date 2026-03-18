import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import type { AuthUser } from '@compass/types';
import { useAuthStore } from '../stores/auth-store';

/** Returns the authenticated user or redirects to login */
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
