/**
 * AuthProvider — restores and manages Supabase auth sessions.
 *
 * Architecture:
 *   1. onAuthStateChange (INITIAL_SESSION) provides the session from localStorage.
 *   2. A separate useEffect resolves the full AuthUser from org_members.
 *   3. DB queries are NEVER called inside onAuthStateChange (causes deadlock
 *      per gotrue-js #762).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { UserRole, getTierFromRole } from '@compass/types';
import type { AuthUser, SessionContext } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
}

/** Resolve full AuthUser from org_members lookup + Supabase user metadata. */
async function resolveUser(
  userId: string,
  email: string,
  metadata: Record<string, unknown> | null | undefined,
): Promise<AuthUser> {
  const { data: member } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', userId)
    .single();

  const role = (member?.role as UserRole) ?? UserRole.CLIENT_USER;
  const tier = getTierFromRole(role);

  const metaFullName = typeof metadata?.full_name === 'string' ? metadata.full_name : null;
  const metaAvatar = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;

  return {
    id: userId,
    email,
    fullName: metaFullName,
    avatarUrl: metaAvatar,
    role,
    organizationId: member?.organization_id ?? null,
    tier,
  };
}

function buildSessionContext(
  session: Session,
  user: AuthUser,
): SessionContext {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    user,
  };
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const { setSession, clearSession, setInitialized, setError, isInitialized } = useAuthStore();
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const resolving = useRef(false);

  // Step 1: Listen to Supabase auth events.
  // INITIAL_SESSION fires synchronously on subscribe with the stored session.
  // No Supabase DB calls here — just capture the session object.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') {
          setSupabaseSession(session);
          setSessionReady(true);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSupabaseSession(session);
          if (!sessionReady) setSessionReady(true);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseSession(null);
          clearSession();
        }
      },
    );

    return () => { subscription.unsubscribe(); };
  }, [clearSession, sessionReady]);

  // Step 2: When we have a session, resolve the user profile from org_members.
  // This runs OUTSIDE onAuthStateChange, avoiding the gotrue-js #762 deadlock.
  useEffect(() => {
    if (!sessionReady) return;

    if (!supabaseSession?.user) {
      // No session — mark initialized so the app can render (login page).
      if (!useAuthStore.getState().isInitialized) {
        setInitialized();
      }
      return;
    }

    // Prevent concurrent resolves (StrictMode double-mount).
    if (resolving.current) return;
    resolving.current = true;

    const userId = supabaseSession.user.id;
    const email = supabaseSession.user.email ?? '';
    const metadata = supabaseSession.user.user_metadata as Record<string, unknown> | null | undefined;

    resolveUser(userId, email, metadata)
      .then((user) => {
        setSession(buildSessionContext(supabaseSession, user));
      })
      .catch(() => {
        setError('Failed to resolve user profile');
      })
      .finally(() => {
        resolving.current = false;
        if (!useAuthStore.getState().isInitialized) {
          setInitialized();
        }
      });
  }, [supabaseSession, sessionReady, setSession, setInitialized, setError]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--grey-50)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[var(--grey-500)]" />
      </div>
    );
  }

  return <>{children}</>;
}
