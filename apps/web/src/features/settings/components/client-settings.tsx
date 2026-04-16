/**
 * Client-tier settings page.
 *
 * Minimal scope for Phase 3: account identity (read-only) and notification
 * preferences. Theme is controlled from the profile-menu theme toggle, not
 * duplicated here. Richer options (language, timezone) are follow-up work.
 */

import type { ReactElement } from 'react';
import type { AuthUser } from '@compass/types';

interface ClientSettingsProps {
  user: AuthUser;
}

export function ClientSettings({ user }: ClientSettingsProps): ReactElement {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--grey-900)]">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Account identity (read-only) */}
        <section
          aria-labelledby="account-heading"
          className="rounded-lg border border-[var(--grey-300)] bg-[var(--surface)] p-6"
        >
          <h2
            id="account-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
          >
            Account
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-[var(--text-secondary)]">Name</dt>
            <dd className="text-[var(--grey-900)]">{user.fullName ?? '—'}</dd>
            <dt className="text-[var(--text-secondary)]">Email</dt>
            <dd className="text-[var(--grey-900)]">{user.email}</dd>
            <dt className="text-[var(--text-secondary)]">Role</dt>
            <dd className="text-[var(--grey-900)]">{formatRole(user.role)}</dd>
          </dl>
          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            Contact your administrator to update your account details.
          </p>
        </section>

        {/* Notification preferences (placeholder — wired up in a follow-up) */}
        <section
          aria-labelledby="notifications-heading"
          className="rounded-lg border border-[var(--grey-300)] bg-[var(--surface)] p-6"
        >
          <h2
            id="notifications-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
          >
            Notifications
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Notification preferences will be available soon.
          </p>
        </section>
      </div>
    </div>
  );
}

function formatRole(role: string): string {
  return role
    .replace(/^client_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
