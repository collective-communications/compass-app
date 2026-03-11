/**
 * Pure route guard logic for admin routes.
 *
 * Returns the redirect path if access is denied, or null if access is allowed.
 * Separated from routes.tsx so guards can be tested without mocking @tanstack/react-router.
 */

import { useAuthStore } from '../../stores/auth-store';
import { UserRole } from '@compass/types';

/**
 * Checks if the current user is tier_1. Returns redirect path if not.
 */
export function checkTier1Access(): string | null {
  const { user } = useAuthStore.getState();
  if (!user || user.tier !== 'tier_1') {
    return '/dashboard';
  }
  return null;
}

/**
 * Checks if the current user is CCC_ADMIN. Returns redirect path if not.
 */
export function checkCccAdminAccess(): string | null {
  const { user } = useAuthStore.getState();
  if (user?.role !== UserRole.CCC_ADMIN) {
    return '/admin/surveys';
  }
  return null;
}
