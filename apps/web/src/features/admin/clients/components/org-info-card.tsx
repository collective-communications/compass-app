/**
 * Organization info display card.
 * Shows logo/initials, name, industry, employee count, primary contact, and slug.
 */

import type { ReactElement } from 'react';
import type { OrganizationSummary } from '@compass/types';
import { Card } from '../../../../components/ui/card';

export interface OrgInfoCardProps {
  organization: OrganizationSummary;
  onEdit: () => void;
}

/** Generates initials from an organization name (up to 2 characters) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function OrgInfoCard({ organization, onEdit }: OrgInfoCardProps): ReactElement {
  return (
    <Card className="rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Logo or initials fallback */}
          {organization.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt={`${organization.name} logo`}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-lg font-semibold text-[var(--grey-700)]"
              aria-hidden="true"
            >
              {getInitials(organization.name)}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[var(--grey-900)]">{organization.name}</h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{organization.slug}</p>

            <div className="mt-3 flex flex-col gap-1 text-sm text-[var(--text-tertiary)]">
              {organization.industry && <span>{organization.industry}</span>}
              {organization.employeeCount != null && (
                <span>{organization.employeeCount.toLocaleString()} employees</span>
              )}
            </div>

            {(organization.primaryContactName || organization.primaryContactEmail) && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-[var(--grey-700)]">Primary Contact</p>
                {organization.primaryContactName && (
                  <p className="text-[var(--text-tertiary)]">{organization.primaryContactName}</p>
                )}
                {organization.primaryContactEmail && (
                  <a
                    href={`mailto:${organization.primaryContactEmail}`}
                    className="text-[var(--color-core-text)] hover:underline"
                  >
                    {organization.primaryContactEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-core-text)] transition-colors hover:bg-[var(--grey-100)]"
        >
          Edit
        </button>
      </div>
    </Card>
  );
}
