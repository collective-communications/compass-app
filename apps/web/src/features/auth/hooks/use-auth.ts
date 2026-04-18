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

/**
 * Validate that a returnTo search param is a safe same-origin relative path.
 *
 * Rejects any of the following (evaluated against BOTH the raw value and its
 * fully-decoded form — repeated `decodeURIComponent` until it stabilizes — so
 * single- and double-encoded attacks are handled identically):
 *
 *   - Empty / non-string input.
 *   - Paths that do not start with a single `/` (i.e. not a relative app path).
 *   - Protocol-relative URLs like `//evil.com` (browsers treat as absolute).
 *   - Fully-qualified URLs containing `://` (e.g. `https://evil.com`).
 *   - Backslashes (`\\`) — some browsers normalize `\\evil.com` to `//evil.com`.
 *   - Malformed percent-encoding (`decodeURIComponent` throws).
 *
 * Decoding in a loop matters: an attacker who double-encodes `//` as
 * `%252F%252F` would otherwise slip past a single-pass decode because the first
 * decode yields `%2F%2F`, which does not contain a literal `/`. Iterating until
 * the string stops changing collapses every level of encoding to its ultimate
 * decoded form before we check.
 */
export function isValidReturnTo(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;

  // Iteratively decode so double-encoded traversal (`%252F%252F…`) is rejected.
  let decoded = value;
  try {
    for (let i = 0; i < 5; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    // Malformed percent-encoding → unsafe.
    return false;
  }

  // Check BOTH raw and fully-decoded forms so `%2F%2Fevil.com` (which decodes
  // to `//evil.com`) is rejected even though it starts with `%` in raw form.
  for (const candidate of [value, decoded]) {
    if (!candidate.startsWith('/')) return false;
    if (candidate.startsWith('//')) return false;
    if (candidate.includes('://')) return false;
    if (candidate.includes('\\')) return false;
  }

  return true;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  let returnTo: string | undefined;
  try {
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    const raw = typeof search.returnTo === 'string' ? search.returnTo : undefined;
    returnTo = raw && isValidReturnTo(raw) ? raw : undefined;
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
