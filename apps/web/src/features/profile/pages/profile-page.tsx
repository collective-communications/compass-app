/**
 * Unified profile page — identical surface for every role.
 *
 * Displays account identity and basic metadata. Sign-out lives in the profile
 * menu (not duplicated here). Editing is a follow-up.
 */

import type { ReactElement } from 'react';
import { useRequireAuth } from '../../../hooks/use-require-auth';

export function ProfilePage(): ReactElement {
  const user = useRequireAuth();

  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--grey-900)]">Profile</h1>

      <section
        aria-labelledby="identity-heading"
        className="rounded-lg border border-[var(--grey-300)] bg-[var(--surface)] p-6"
      >
        <h2
          id="identity-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
        >
          Identity
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-[var(--text-secondary)]">Name</dt>
          <dd className="text-[var(--grey-900)]">{user.fullName ?? '—'}</dd>
          <dt className="text-[var(--text-secondary)]">Email</dt>
          <dd className="text-[var(--grey-900)]">{user.email}</dd>
          <dt className="text-[var(--text-secondary)]">Role</dt>
          <dd className="text-[var(--grey-900)]">{user.role}</dd>
        </dl>
      </section>
    </div>
  );
}
