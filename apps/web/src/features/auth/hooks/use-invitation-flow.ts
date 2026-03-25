/**
 * Hook encapsulating the invitation acceptance flow:
 * token validation, form state management, submission, and auto-sign-in.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { type UserRole, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { supabase } from '../../../lib/supabase';
import { optionalEnv } from '@compass/utils';

export interface InvitationDetails {
  email: string;
  role: string;
  roleLabel: string;
  organizationName: string | null;
  expiresAt: string;
}

export type InvitationStatus = 'loading' | 'invalid' | 'expired' | 'ready' | 'submitting' | 'success' | 'error';

export interface UseInvitationFlowReturn {
  status: InvitationStatus;
  invitation: InvitationDetails | null;
  fullName: string;
  setFullName: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  formError: string | null;
  isExistingUser: boolean;
  canSubmit: boolean;
  passwordRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useInvitationFlow(token: string | undefined): UseInvitationFlowReturn {
  const navigate = useNavigate();

  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Validate the invitation token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    async function validateToken(): Promise<void> {
      try {
        const supabaseUrl = optionalEnv('VITE_SUPABASE_URL', '');
        const anonKey = optionalEnv('VITE_SUPABASE_ANON_KEY', '');
        const response = await fetch(
          `${supabaseUrl}/functions/v1/accept-invitation?token=${token}`,
          {
            headers: {
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
            },
          },
        );

        const result = await response.json();

        if (!response.ok) {
          if (result.error === 'EXPIRED_INVITATION') {
            setStatus('expired');
          } else {
            setStatus('invalid');
          }
          return;
        }

        setInvitation({
          email: result.email,
          role: result.role,
          roleLabel: result.roleLabel,
          organizationName: result.organizationName,
          expiresAt: result.expiresAt,
        });
        setStatus('ready');
      } catch {
        setStatus('invalid');
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setFormError(null);

      if (!fullName.trim()) {
        setFormError('Full name is required.');
        return;
      }

      if (password.length < 8) {
        setFormError('Password must be at least 8 characters.');
        passwordRef.current?.focus();
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      setStatus('submitting');

      try {
        const supabaseUrl = optionalEnv('VITE_SUPABASE_URL', '');
        const anonKey = optionalEnv('VITE_SUPABASE_ANON_KEY', '');
        const response = await fetch(
          `${supabaseUrl}/functions/v1/accept-invitation`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invitationId: token,
              password,
              fullName: fullName.trim(),
            }),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          setFormError(result.message ?? 'Failed to create account. Please try again.');
          setStatus('ready');
          return;
        }

        setIsExistingUser(result.isExistingUser);

        // Auto-sign in with the new credentials
        if (!result.isExistingUser) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation!.email,
            password,
          });

          if (signInError || !signInData.user) {
            // Account created but auto-sign-in failed — redirect to login
            setStatus('success');
            return;
          }

          // Navigate to the appropriate tier
          const { data: member } = await supabase
            .from('org_members')
            .select('role')
            .eq('user_id', signInData.user.id)
            .single();

          const role: UserRole = (member?.role as UserRole) ?? 'client_user';
          const tier = getTierFromRole(role);
          await navigate({ to: getTierHomeRoute(tier) });
        } else {
          // Existing user — they need to sign in with their current password
          setStatus('success');
        }
      } catch {
        setFormError('Unable to connect. Please try again.');
        setStatus('ready');
      }
    },
    [token, fullName, password, confirmPassword, invitation, navigate],
  );

  const isReady = status === 'ready';
  const canSubmit = fullName.trim() !== '' && password.length >= 8 && password === confirmPassword && isReady;

  return {
    status,
    invitation,
    fullName,
    setFullName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    formError,
    isExistingUser,
    canSubmit,
    passwordRef,
    handleSubmit,
  };
}
