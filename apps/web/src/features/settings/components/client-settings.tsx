/**
 * Client-tier settings page.
 *
 * Minimal scope for Phase 3: account identity (read-only) and notification
 * preferences. Theme is controlled from the profile-menu theme toggle, not
 * duplicated here. Richer options (language, timezone) are follow-up work.
 */

import type { ReactElement } from 'react';
import type { AuthUser } from '@compass/types';
import { useNotificationPreferences } from '../hooks/use-notification-preferences';

interface ClientSettingsProps {
  user: AuthUser;
}

export function ClientSettings({ user }: ClientSettingsProps): ReactElement {
  const { preferences, isLoading, updatePreference, isSaving } = useNotificationPreferences();

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

        <section
          aria-labelledby="notifications-heading"
          className="rounded-lg border border-[var(--grey-300)] bg-[var(--surface)] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="notifications-heading"
              className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
            >
              Notifications
            </h2>
            {isSaving && (
              <span className="text-xs text-[var(--text-secondary)]">Saving…</span>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-[var(--grey-200)]" />
                    <div className="h-3 w-48 animate-pulse rounded bg-[var(--grey-100)]" />
                  </div>
                  <div className="h-5 w-9 animate-pulse rounded-full bg-[var(--grey-200)]" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Email notification settings">
              <NotificationRow
                label="Survey invitations"
                description="Receive an email when you are invited to complete a survey."
                checked={preferences.surveyInvitationEnabled}
                onToggle={() =>
                  updatePreference('surveyInvitationEnabled', !preferences.surveyInvitationEnabled)
                }
              />
              <NotificationRow
                label="Reminders"
                description="Receive follow-up reminders for surveys you have not yet completed."
                checked={preferences.reminderEnabled}
                onToggle={() => updatePreference('reminderEnabled', !preferences.reminderEnabled)}
              />
              <NotificationRow
                label="Report ready"
                description="Receive an email when your results report is available to view."
                checked={preferences.reportReadyEnabled}
                onToggle={() =>
                  updatePreference('reportReadyEnabled', !preferences.reportReadyEnabled)
                }
              />
            </ul>
          )}
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

interface NotificationRowProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function NotificationRow({ label, description, checked, onToggle }: NotificationRowProps): ReactElement {
  return (
    <li className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-[var(--grey-900)]">{label}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          width: 36,
          height: 20,
          borderRadius: 9999,
          padding: 2,
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--color-core, #0C3D50)' : 'var(--grey-200)',
        }}
      >
        <span
          style={{
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: 9999,
            background: '#ffffff',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </button>
    </li>
  );
}
