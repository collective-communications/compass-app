/**
 * Inline invitation form for sending email invitations with role assignment.
 * Validates email format and prevents duplicate invitations.
 * No toast notifications — all feedback is inline.
 */

import { useState, useCallback, type ReactElement, type FormEvent } from 'react';
import type { CccRole, ClientRole, Invitation } from '../services/user-service';

export interface InviteFormProps {
  availableRoles: ReadonlyArray<{ value: string; label: string }>;
  defaultRole: CccRole | ClientRole;
  existingEmails: string[];
  pendingEmails: string[];
  onInvite: (email: string, role: CccRole | ClientRole) => void;
  isPending: boolean;
  error: string | null;
  lastCreated: Invitation | null;
  onClose?: () => void;
}

/** Validates basic email format */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteForm({
  availableRoles,
  defaultRole,
  existingEmails,
  pendingEmails,
  onInvite,
  isPending,
  error,
  lastCreated,
  onClose,
}: InviteFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CccRole | ClientRole>(defaultRole);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      setValidationError(null);

      const trimmed = email.trim().toLowerCase();

      if (!trimmed) {
        setValidationError('Email is required.');
        return;
      }

      if (!isValidEmail(trimmed)) {
        setValidationError('Enter a valid email address.');
        return;
      }

      if (existingEmails.includes(trimmed)) {
        setValidationError('This person is already a member.');
        return;
      }

      if (pendingEmails.includes(trimmed)) {
        setValidationError('An invitation is already pending for this email.');
        return;
      }

      onInvite(trimmed, role);
      setEmail('');
    },
    [email, role, existingEmails, pendingEmails, onInvite],
  );

  const displayError = validationError ?? error;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Invite Team Member
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--grey-700)]"
            aria-label="Close invite form"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Email input */}
        <div className="flex-1">
          <label htmlFor="invite-email" className="mb-1 block text-xs font-medium text-[var(--text-tertiary)]">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="name@example.com"
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-2 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)] disabled:opacity-50"
            aria-invalid={!!displayError}
            aria-describedby={displayError ? 'invite-error' : undefined}
          />
        </div>

        {/* Role selector */}
        <div className="sm:w-40">
          <label htmlFor="invite-role" className="mb-1 block text-xs font-medium text-[var(--text-tertiary)]">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as CccRole | ClientRole)}
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-2 text-sm text-[var(--grey-700)] disabled:opacity-50"
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Send Invite'}
        </button>
      </div>

      {/* Inline error */}
      {displayError && (
        <p id="invite-error" className="mt-2 text-xs text-red-700" role="alert">
          {displayError}
        </p>
      )}

      {/* Success feedback */}
      {lastCreated && !displayError && (
        <p className="mt-2 text-xs text-green-700" role="status">
          Invitation sent to {lastCreated.email}. Expires in 7 days.
        </p>
      )}
    </form>
  );
}
