import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../../../lib/supabase';

interface UsePasswordResetReturn {
  requestReset: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function isConnectivityError(message: string): boolean {
  return /fetch|network|failed to fetch|load failed/i.test(message);
}

/**
 * Wraps `supabase.auth.resetPasswordForEmail` with anti-enumeration behavior:
 * always navigates to the sent page regardless of whether the email exists.
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const requestReset = useCallback(async (email: string): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError && isConnectivityError(resetError.message)) {
        setError('Unable to connect. Please try again.');
        setIsLoading(false);
        return;
      }
      // Always navigate to sent page for Auth API responses — regardless of
      // whether the email exists or the provider suppressed the send.
      await navigate({ to: '/auth/forgot-password/sent', search: { email } });
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return { requestReset, isLoading, error };
}
