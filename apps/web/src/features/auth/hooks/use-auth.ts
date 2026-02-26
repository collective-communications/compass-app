import { useState, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { LOGIN_ERRORS } from '../constants';

interface UseAuthReturn {
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'azure') => Promise<void>;
}

/**
 * Resolves the user's role from org_members and navigates to the
 * appropriate tier home route (or a returnTo search param if present).
 */
async function resolveRoleAndNavigate(
  userId: string,
  navigate: ReturnType<typeof useNavigate>,
  returnTo: string | undefined,
): Promise<void> {
  const { data: member, error: memberError } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (memberError || !member) {
    // User authenticated but has no org membership — default to client user tier
    const tier = getTierFromRole('client_user');
    const destination = returnTo ?? getTierHomeRoute(tier);
    await navigate({ to: destination });
    return;
  }

  const role = member.role as UserRole;
  const tier = getTierFromRole(role);
  const destination = returnTo ?? getTierHomeRoute(tier);
  await navigate({ to: destination });
}

/**
 * Maps Supabase auth error messages to user-friendly LOGIN_ERRORS.
 */
function mapSupabaseError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return LOGIN_ERRORS.INVALID_CREDENTIALS;
  }
  if (message.includes('locked') || message.includes('disabled')) {
    return LOGIN_ERRORS.ACCOUNT_LOCKED;
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
    return LOGIN_ERRORS.NETWORK_ERROR;
  }
  return LOGIN_ERRORS.UNKNOWN;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  let returnTo: string | undefined;
  try {
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    returnTo = typeof search.returnTo === 'string' ? search.returnTo : undefined;
  } catch {
    returnTo = undefined;
  }

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsLoading(true);

      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(mapSupabaseError(authError.message));
          return;
        }

        if (!data.user) {
          setError(LOGIN_ERRORS.UNKNOWN);
          return;
        }

        await resolveRoleAndNavigate(data.user.id, navigate, returnTo);
      } catch {
        setError(LOGIN_ERRORS.NETWORK_ERROR);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, returnTo],
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'azure'): Promise<void> => {
      setError(null);
      setIsLoading(true);

      try {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: provider === 'azure' ? 'azure' : 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (oauthError) {
          const label = provider === 'azure' ? 'Microsoft' : 'Google';
          setError(LOGIN_ERRORS.OAUTH_FAILED(label));
          setIsLoading(false);
        }
        // If successful, the browser redirects — isLoading stays true
      } catch {
        const label = provider === 'azure' ? 'Microsoft' : 'Google';
        setError(LOGIN_ERRORS.OAUTH_FAILED(label));
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, error, clearError, signInWithEmail, signInWithOAuth };
}
