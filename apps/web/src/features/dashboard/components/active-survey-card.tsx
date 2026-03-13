/**
 * Active survey card for the client dashboard.
 * Displays status badge, title, close date, response stats, and progress bar.
 * Only rendered when an active survey exists.
 */

import type { ReactElement } from 'react';
import type { ActiveSurvey } from '../hooks/use-dashboard-data';
import { Card } from '../../../components/ui/card';

interface ActiveSurveyCardProps {
  data: ActiveSurvey;
}

/** Format an ISO date string to a readable format (e.g., "March 15, 2026") */
function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ActiveSurveyCard({ data }: ActiveSurveyCardProps): ReactElement {
  const { survey, responseCount, expectedCount, completionPercent, daysRemaining } = data;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[var(--grey-900)]">{survey.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Closes {formatDate(survey.closesAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--grey-700)] px-3 py-1 text-xs font-semibold uppercase text-[var(--grey-50)]">
          Active
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Responses
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--grey-900)]">
            {responseCount} / {expectedCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Completion
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--grey-900)]">{completionPercent}%</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Days Left
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--grey-900)]">
            {daysRemaining ?? '--'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuenow={responseCount}
          aria-valuemin={0}
          aria-valuemax={expectedCount}
          aria-label={`${responseCount} of ${expectedCount} responses`}
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--grey-100)]"
        >
          <div
            className="h-full rounded-full bg-[var(--color-core)] transition-[width] duration-300"
            style={{
              width: expectedCount > 0 ? `${Math.min(completionPercent, 100)}%` : '0%',
            }}
          />
        </div>
      </div>
    </Card>
  );
}
