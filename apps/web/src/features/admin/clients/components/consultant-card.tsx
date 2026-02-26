/**
 * Assigned consultant card for the client detail page.
 * Shows consultant avatar (initials), name, and assignment date.
 */

import type { ReactElement } from 'react';
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

/** Formats a date string as "MMM D, YYYY" */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ConsultantCard({ orgId }: ConsultantCardProps): ReactElement {
  const { data: consultant, isLoading } = useConsultant(orgId);

  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--grey-500)]">
        Assigned Consultant
      </h3>

      {isLoading && (
        <p className="text-sm text-[var(--grey-500)]">Loading...</p>
      )}

      {!isLoading && !consultant && (
        <p className="text-sm text-[var(--grey-500)]">No consultant assigned.</p>
      )}

      {!isLoading && consultant && (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5E4E0] text-sm font-semibold text-[var(--grey-700)]"
            aria-hidden="true"
          >
            {getInitials(consultant.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--grey-900)]">{consultant.name}</p>
            <p className="text-xs text-[var(--grey-500)]">
              Assigned {formatDate(consultant.assignedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
