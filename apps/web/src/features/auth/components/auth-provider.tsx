import { useEffect, type ReactNode } from 'react';
import { UserRole, getTierFromRole } from '@compass/types';
import type { AuthUser, SessionContext } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
}

/** Resolve full AuthUser from Supabase session + org_members lookup */
async function resolveUser(userId: string, email: string): Promise<AuthUser> {
  const { data: member } = await supabase
    .from('org_members')
    .select('role, org_id')
    .eq('user_id', userId)
    .single();

  const role = (member?.role as UserRole) ?? UserRole.CLIENT_USER;
  const tier = getTierFromRole(role);

  return {
    id: userId,
    email,
    fullName: null,
    avatarUrl: null,
    role,
    organizationId: member?.org_id ?? null,
    tier,
  };
}

function buildSessionContext(
  session: { access_token: string; refresh_token: string; expires_at?: number },
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const user = await resolveUser(session.user.id, session.user.email ?? '');
          setSession(buildSessionContext(session, user));
        } catch {
          setError('Failed to resolve user profile');
        }
      }
      setInitialized();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            const user = await resolveUser(session.user.id, session.user.email ?? '');
            setSession(buildSessionContext(session, user));
          } catch {
            setError('Failed to resolve user profile');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [setSession, clearSession, setInitialized, setError]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--grey-500)]">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
