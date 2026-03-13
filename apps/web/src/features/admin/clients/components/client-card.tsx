/**
 * Organization card for the admin client list.
 * Displays org name, industry, employee count, active survey status,
 * metrics (total surveys, last score, trend), and assigned consultant.
 * Left border color indicates health: green = active healthy, orange = needs attention.
 */

import type { ReactElement } from 'react';
import type { OrganizationSummary } from '@compass/types';

export interface ClientCardProps {
  organization: OrganizationSummary;
  onClick: (orgId: string) => void;
}

/** Generates initials from an organization name (up to 2 characters) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Determines the left border class based on organization survey health */
function getBorderClass(org: OrganizationSummary): string {
  if (!org.activeSurveyId) return '';
  if (org.daysRemaining !== null && org.daysRemaining <= 3) return 'border-l-4 border-l-[var(--severity-high-border)]';
  if (org.completionRate !== null && org.completionRate < 30) return 'border-l-4 border-l-[var(--severity-high-border)]';
  return 'border-l-4 border-l-[var(--severity-healthy-border)]';
}

/** Trend arrow indicator for score changes */
function TrendArrow({ trend }: { trend: 'up' | 'down' | 'stable' | null }): ReactElement | null {
  if (!trend || trend === 'stable') return null;
  return (
    <span
      role="img"
      className={trend === 'up' ? 'text-[var(--severity-healthy-text)]' : 'text-[var(--severity-high-text)]'}
      aria-label={`Score trending ${trend}`}
    >
      {trend === 'up' ? '\u2191' : '\u2193'}
    </span>
  );
}

export function ClientCard({ organization, onClick }: ClientCardProps): ReactElement {
  const initials = getInitials(organization.name);
  const borderClass = getBorderClass(organization);

  return (
    <button
      type="button"
      onClick={() => onClick(organization.id)}
      className={`w-full cursor-pointer rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 text-left transition-shadow hover:shadow-md ${borderClass}`}
      aria-label={`View ${organization.name}`}
    >
      <div className="flex items-start gap-4">
        {/* Logo placeholder: initials in circle */}
        {organization.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={`${organization.name} logo`}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--grey-200)] text-sm font-semibold text-[var(--grey-700)]"
            aria-hidden="true"
          >
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-semibold text-[var(--grey-900)]">
              {organization.name}
            </h3>
            {organization.activeSurveyId && (
              <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Active Survey
              </span>
            )}
          </div>

          {/* Industry and employee count */}
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            {organization.industry && <span>{organization.industry}</span>}
            {organization.industry && organization.employeeCount && (
              <span aria-hidden="true">&middot;</span>
            )}
            {organization.employeeCount && (
              <span>{organization.employeeCount.toLocaleString()} employees</span>
            )}
          </div>

          {/* Metrics row */}
          <div className="mt-3 flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
            <span>{organization.totalSurveys} survey{organization.totalSurveys !== 1 ? 's' : ''}</span>
            {organization.lastScore !== null && (
              <span className="flex items-center gap-1">
                Score: {organization.lastScore.toFixed(1)}
                <TrendArrow trend={organization.scoreTrend} />
              </span>
            )}
            {organization.activeSurveyTitle && (
              <span className="truncate">{organization.activeSurveyTitle}</span>
            )}
          </div>

          {/* Assigned consultant */}
          {organization.assignedConsultant && (
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              Consultant: {organization.assignedConsultant}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
