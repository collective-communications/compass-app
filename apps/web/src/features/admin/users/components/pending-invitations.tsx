/**
 * Pending invitations list with expired badge and resend/revoke actions.
 * Expired invitations show "Expired" badge and a "Resend" button.
 * All feedback is inline — no toast notifications.
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { Invitation } from '../services/user-service';

export interface PendingInvitationsProps {
  invitations: Invitation[];
  onResend: (invitationId: string) => void;
  onRevoke: (invitationId: string) => void;
  isResending: boolean;
  isRevoking: boolean;
  resendError: string | null;
  revokeError: string | null;
}

/** Role display labels */
const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'Admin',
  ccc_member: 'Member',
  client_exec: 'Executive',
  client_director: 'Director',
  client_manager: 'Manager',
};

/** Checks whether an invitation has expired */
function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

/** Formats remaining time until expiry */
function formatExpiry(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

export function PendingInvitations({
  invitations,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
  resendError,
  revokeError,
}: PendingInvitationsProps): ReactElement {
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const handleRevoke = useCallback(
    (id: string): void => {
      if (confirmRevokeId === id) {
        onRevoke(id);
        setConfirmRevokeId(null);
      } else {
        setConfirmRevokeId(id);
      }
    },
    [confirmRevokeId, onRevoke],
  );

  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Pending Invitations
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">No pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Pending Invitations ({invitations.length})
      </h3>

      {/* Inline errors */}
      {resendError && (
        <p className="mb-3 text-xs text-[var(--feedback-error-text)]" role="alert">
          {resendError}
        </p>
      )}
      {revokeError && (
        <p className="mb-3 text-xs text-[var(--feedback-error-text)]" role="alert">
          {revokeError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {invitations.map((inv) => {
          const expired = isExpired(inv.expiresAt);

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--grey-200)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--grey-900)]">
                    {inv.email}
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--grey-100)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </span>
                  {expired && (
                    <span className="shrink-0 rounded-full bg-[var(--feedback-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--feedback-error-text)]">
                      Expired
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {formatExpiry(inv.expiresAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {expired && (
                  <button
                    type="button"
                    onClick={() => onResend(inv.id)}
                    disabled={isResending}
                    className="text-xs font-medium text-[var(--color-interactive)] hover:underline disabled:opacity-50"
                  >
                    Resend
                  </button>
                )}

                {confirmRevokeId === inv.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRevoke(inv.id)}
                      disabled={isRevoking}
                      className="text-xs font-medium text-[var(--feedback-error-text)] hover:text-[var(--feedback-error-text)] disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeId(null)}
                      className="text-xs font-medium text-[var(--text-tertiary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isRevoking}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--feedback-error-text)] disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
