/**
 * Unified `/settings` page. Dispatches to role-appropriate content.
 *
 * - ccc_admin  → `SystemSettingsPage` (survey defaults, branding, email, data
 *                security). Lifted from `features/admin/settings` — the page
 *                is unchanged; only its mount point moves.
 * - everyone else → `ClientSettings` (account identity + notification prefs).
 *                   This preserves the pre-refactor behaviour where only
 *                   ccc_admin reached `/admin/settings`; other roles now
 *                   simply see a less-privileged view at the same URL rather
 *                   than a 403 or redirect.
 *
 * Shell and nav are identical for every role; only the body swaps. That is
 * the whole point of flattening `/admin/settings` into `/settings`.
 */

import type { ReactElement } from 'react';
import { UserRole } from '@compass/types';
import { useRequireAuth } from '../../../hooks/use-require-auth';
import { SystemSettingsPage } from '../../admin/settings';
import { ClientSettings } from '../components/client-settings';

export function SettingsPage(): ReactElement {
  const user = useRequireAuth();

  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  return user.role === UserRole.CCC_ADMIN ? (
    <SystemSettingsPage />
  ) : (
    <ClientSettings user={user} />
  );
}
