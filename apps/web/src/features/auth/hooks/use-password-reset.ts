import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../../../lib/supabase';

interface UsePasswordResetReturn {
  requestReset: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
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
      if (resetError) {
        // Surface only rate-limit or network errors — never "email not found"
        if (resetError.message.includes('rate') || resetError.message.includes('limit')) {
          setError('Too many requests. Please wait a moment.');
        } else if (resetError.message.includes('fetch') || resetError.message.includes('network')) {
          setError('Unable to connect. Please try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setIsLoading(false);
        return;
      }
      // Always navigate to sent page — regardless of whether email exists
      await navigate({ to: '/auth/forgot-password/sent', search: { email } });
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return { requestReset, isLoading, error };
}
