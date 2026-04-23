import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { SessionContext, AuthUser } from '@compass/types';

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let signOutResult = { error: null as null | { message: string } };

mock.module('../lib/supabase', () => ({
  surveySessionClient: () => ({ from: () => ({}) }),
  supabase: {
    auth: {
      signOut: () => Promise.resolve(signOutResult),
    },
  },
}));

const { useAuthStore } = await import('./auth-store.js');

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    fullName: 'Test Admin',
    avatarUrl: null,
    role: 'ccc_admin',
    organizationId: null,
    tier: 'tier_1',
    ...overrides,
  };
}

function makeSession(overrides?: Partial<SessionContext>): SessionContext {
  return {
    accessToken: 'access-tok',
    refreshToken: 'refresh-tok',
    expiresAt: Date.now() + 3600_000,
    user: makeUser(),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    signOutResult = { error: null };
    // Reset store to initial state
    useAuthStore.setState({
      session: null,
      user: null,
      isLoading: true,
      error: null,
      isInitialized: false,
    });
  });

  test('initial state: loading, no session, not initialized', () => {
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.isInitialized).toBe(false);
  });

  test('setSession stores session and user, clears loading and error', () => {
    const session = makeSession();
    useAuthStore.getState().setSession(session);

    const state = useAuthStore.getState();
    expect(state.session).toBe(session);
    expect(state.user).toBe(session.user);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test('clearSession resets session and user to null', () => {
    useAuthStore.getState().setSession(makeSession());
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test('setError stores error string and stops loading', () => {
    useAuthStore.getState().setError('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.error).toBe('Invalid credentials');
    expect(state.isLoading).toBe(false);
  });

  test('setError with null clears previous error', () => {
    useAuthStore.getState().setError('Some error');
    useAuthStore.getState().setError(null);

    expect(useAuthStore.getState().error).toBeNull();
  });

  test('setLoading toggles isLoading flag', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);

    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  test('setInitialized marks store as initialized and stops loading', () => {
    useAuthStore.getState().setInitialized();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  test('signOut calls supabase.auth.signOut and clears state', async () => {
    useAuthStore.getState().setSession(makeSession());
    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test('setSession with tier_2 client user stores correct tier', () => {
    const clientUser = makeUser({
      role: 'client_exec',
      tier: 'tier_2',
      organizationId: 'org-1',
    });
    const session = makeSession({ user: clientUser });
    useAuthStore.getState().setSession(session);

    const state = useAuthStore.getState();
    expect(state.user?.tier).toBe('tier_2');
    expect(state.user?.role).toBe('client_exec');
    expect(state.user?.organizationId).toBe('org-1');
  });

  test('setSession overwrites previous session', () => {
    const session1 = makeSession({ user: makeUser({ email: 'first@test.com' }) });
    const session2 = makeSession({ user: makeUser({ email: 'second@test.com' }) });

    useAuthStore.getState().setSession(session1);
    useAuthStore.getState().setSession(session2);

    expect(useAuthStore.getState().user?.email).toBe('second@test.com');
  });
});
