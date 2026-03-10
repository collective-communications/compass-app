/**
 * User card for team member display.
 * Shows avatar, name, role, email, assigned clients, and last active time.
 * White bg, #E5E4E0 border, 8-12px radius, 24px padding per design spec.
 */

import { useState, useCallback, type ReactElement } from 'react';
import type { TeamMember, CccRole, ClientRole } from '../services/user-service';

export interface UserCardProps {
  member: TeamMember;
  currentUserId: string;
  totalAdmins: number;
  availableRoles: ReadonlyArray<{ value: string; label: string }>;
  onRoleChange: (userId: string, role: CccRole | ClientRole) => void;
  onRemove: (userId: string) => void;
  roleChangeError: string | null;
  removeError: string | null;
  isUpdating: boolean;
}

/** Role-coded avatar background colors */
const ROLE_AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  ccc_admin: { bg: '#0A3B4F', text: '#FFFFFF' },
  ccc_member: { bg: '#9FD7C3', text: '#0A3B4F' },
};

/** Role display labels */
const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'Admin',
  ccc_member: 'Member',
  client_exec: 'Executive',
  client_director: 'Director',
  client_manager: 'Manager',
};

/** Generates initials from a full name (up to 2 characters) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Formats a date string as relative time (e.g., "2 days ago") */
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function UserCard({
  member,
  currentUserId,
  totalAdmins,
  availableRoles,
  onRoleChange,
  onRemove,
  roleChangeError,
  removeError,
  isUpdating,
}: UserCardProps): ReactElement {
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf = member.id === currentUserId;
  const isLastAdmin = member.role === 'ccc_admin' && totalAdmins <= 1;

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      onRoleChange(member.id, e.target.value as CccRole | ClientRole);
    },
    [member.id, onRoleChange],
  );

  const handleRemoveClick = useCallback((): void => {
    if (confirmRemove) {
      onRemove(member.id);
      setConfirmRemove(false);
    } else {
      setConfirmRemove(true);
    }
  }, [confirmRemove, member.id, onRemove]);

  const handleCancelRemove = useCallback((): void => {
    setConfirmRemove(false);
  }, []);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={`${member.fullName} avatar`}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              backgroundColor: ROLE_AVATAR_COLORS[member.role]?.bg ?? 'var(--grey-200)',
              color: ROLE_AVATAR_COLORS[member.role]?.text ?? 'var(--grey-700)',
            }}
            aria-hidden="true"
          >
            {getInitials(member.fullName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--grey-900)]">
                {member.fullName}
                {isSelf && (
                  <span className="ml-2 text-xs font-normal text-[var(--grey-500)]">(you)</span>
                )}
              </h3>
              <p className="truncate text-sm text-[var(--grey-600)]">{member.email}</p>
            </div>

            {/* Role selector */}
            <div className="shrink-0">
              {isSelf ? (
                <span className="inline-block rounded-full bg-[var(--grey-100)] px-3 py-1 text-xs font-medium text-[var(--grey-700)]">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              ) : (
                <select
                  value={member.role}
                  onChange={handleRoleChange}
                  disabled={isUpdating}
                  className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-1 text-xs font-medium text-[var(--grey-700)] disabled:opacity-50"
                  aria-label={`Role for ${member.fullName}`}
                >
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Metadata row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--grey-500)]">
            {member.assignedClients.length > 0 && (
              <span>
                {member.assignedClients.length} client{member.assignedClients.length !== 1 ? 's' : ''}
              </span>
            )}
            <span>Active {formatRelativeTime(member.lastActiveAt)}</span>
          </div>

          {/* Inline errors */}
          {roleChangeError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {roleChangeError}
            </p>
          )}
          {removeError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {removeError}
            </p>
          )}

          {/* Remove action */}
          {!isSelf && (
            <div className="mt-3">
              {confirmRemove ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--grey-600)]">Remove this person?</span>
                  <button
                    type="button"
                    onClick={handleRemoveClick}
                    disabled={isLastAdmin || isUpdating}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRemove}
                    className="text-xs font-medium text-[var(--grey-600)] hover:text-[var(--grey-700)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveClick}
                  disabled={isLastAdmin || isUpdating}
                  className="text-xs font-medium text-[var(--grey-500)] hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    isLastAdmin
                      ? 'Cannot remove the last admin'
                      : `Remove ${member.fullName}`
                  }
                  title={isLastAdmin ? 'Cannot remove the last admin' : undefined}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
