import { create } from 'zustand';
import type { AuthUser, SessionContext } from '@compass/types';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: SessionContext | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  setSession: (session: SessionContext) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  error: null,
  isInitialized: false,

  setSession: (session) => set({ session, user: session.user, isLoading: false, error: null }),
  clearSession: () => set({ session: null, user: null, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setInitialized: () => set({ isInitialized: true, isLoading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isLoading: false, error: null });
  },
}));
