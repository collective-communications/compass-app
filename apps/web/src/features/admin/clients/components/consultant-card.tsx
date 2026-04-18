/**
 * Assigned consultant card for the client detail page.
 * Shows consultant avatar (initials), name, and assignment date.
 */

import type { ReactElement } from 'react';
import { formatDisplayDate } from '@compass/utils';
import { useConsultant } from '../hooks/use-organization';

export interface ConsultantCardProps {
  orgId: string;
}

/** Generates initials from a name (up to 2 characters) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ConsultantCard({ orgId }: ConsultantCardProps): ReactElement {
  const { data: consultant, isLoading } = useConsultant(orgId);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Assigned Consultant
      </h3>

      {isLoading && (
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      )}

      {!isLoading && !consultant && (
        <p className="text-sm text-[var(--text-secondary)]">No consultant assigned.</p>
      )}

      {!isLoading && consultant && (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-sm font-semibold text-[var(--grey-700)]"
            aria-hidden="true"
          >
            {getInitials(consultant.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--grey-900)]">{consultant.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Assigned {formatDisplayDate(consultant.assignedAt, 'short', { locale: 'en-US' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
