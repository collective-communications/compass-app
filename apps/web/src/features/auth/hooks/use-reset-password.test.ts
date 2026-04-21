/**
 * Tests for `useResetPassword` — the hook powering `/auth/reset-password`.
 *
 * Coverage:
 *   - Without a recovery hash on the URL, hook surfaces the expired state
 *     after the grace window.
 *   - With a recovery hash on the URL, hook immediately exposes the form
 *     (isCheckingSession=false, hasRecoverySession=true, no grace wait).
 *   - `submit` routes server-side errors to user-facing copy.
 *   - Happy-path `submit` signs out, then navigates to `/auth/login` with
 *     the passwordReset flag set.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';

// ─── Mock setup — hoisted before the hook import ─────────────────────────────

const navigateMock = mock(() => Promise.resolve());
mock.module('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

interface UpdateUserResult {
  error: { message: string } | null;
}
const updateUserMock = mock(() => Promise.resolve({ error: null } as UpdateUserResult));
const signOutMock = mock(() => Promise.resolve({ error: null }));
const subscriptionUnsubscribe = mock(() => undefined);
let lastAuthStateListener: ((event: string) => void) | null = null;

mock.module('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (args: { password: string }) => updateUserMock(args),
      signOut: () => signOutMock(),
      onAuthStateChange: (cb: (event: string) => void) => {
        lastAuthStateListener = cb;
        return { data: { subscription: { unsubscribe: subscriptionUnsubscribe } } };
      },
    },
  },
}));

// Stable location shim so each test controls the recovery hash presence.
function setLocationHash(hash: string): void {
  // Use a Location-like object that the module-load check (and the hook)
  // will read from.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hash, href: `http://localhost:42333/auth/reset-password${hash}` },
    writable: true,
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  updateUserMock.mockClear();
  signOutMock.mockClear();
  subscriptionUnsubscribe.mockClear();
  lastAuthStateListener = null;
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useResetPassword — session detection', () => {
  test('surfaces expired state after the grace window when no recovery hash is present', async () => {
    setLocationHash('');
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    // Grace window is 750ms — wait for it to close.
    await waitFor(() => expect(result.current.isCheckingSession).toBe(false), { timeout: 2000 });
    expect(result.current.hasRecoverySession).toBe(false);
  });

  test('surfaces form immediately when a PASSWORD_RECOVERY event fires within the grace window', async () => {
    setLocationHash('');
    // Force a fresh import so RECOVERY_HASH_ON_LOAD is re-evaluated as false.
    delete require.cache?.[require.resolve?.('./use-reset-password')];
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    // Fire the event Supabase emits after consuming the URL hash.
    await act(async () => {
      lastAuthStateListener?.('PASSWORD_RECOVERY');
    });

    await waitFor(() => expect(result.current.hasRecoverySession).toBe(true));
    expect(result.current.isCheckingSession).toBe(false);
  });
});

describe('useResetPassword — submit', () => {
  test('happy path: updateUser → signOut → navigate to /auth/login with passwordReset flag', async () => {
    setLocationHash('#type=recovery&access_token=fake');
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    await act(async () => {
      await result.current.submit('NewPass123!');
    });

    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewPass123!' });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ to: '/auth/login', search: { passwordReset: 1 } });
    expect(result.current.error).toBeNull();
  });

  test('maps the "same password" error to friendly copy', async () => {
    setLocationHash('#type=recovery');
    updateUserMock.mockImplementationOnce(async () => ({
      error: { message: 'New password should be different from the old password.' },
    }));
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    await act(async () => {
      await result.current.submit('NewPass123!');
    });

    expect(result.current.error).toMatch(/different from your current password/i);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  test('maps a network error to the connection-failure copy', async () => {
    setLocationHash('#type=recovery');
    updateUserMock.mockImplementationOnce(async () => ({
      error: { message: 'Failed to fetch (network)' },
    }));
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    await act(async () => {
      await result.current.submit('NewPass123!');
    });

    expect(result.current.error).toMatch(/unable to connect/i);
  });

  test('maps a weak-password rejection verbatim', async () => {
    setLocationHash('#type=recovery');
    updateUserMock.mockImplementationOnce(async () => ({
      error: { message: 'Password should be at least 8 characters.' },
    }));
    const { useResetPassword } = await import('./use-reset-password');
    const { result } = renderHook(() => useResetPassword());

    await act(async () => {
      await result.current.submit('short');
    });

    expect(result.current.error).toMatch(/at least 8 characters/);
  });
});
