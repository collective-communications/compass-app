/**
 * Key metrics summary card for the client detail page.
 * Displays total surveys, culture score with trend, and active survey status.
 */

import type { ReactElement } from 'react';
import type { OrganizationSummary } from '@compass/types';
import { Card } from '../../../../components/ui/card';

export interface KeyMetricsCardProps {
  organization: OrganizationSummary;
}

/** Trend arrow with color coding */
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' | null }): ReactElement | null {
  if (!trend) return null;
  if (trend === 'stable') {
    return (
      <span className="text-[var(--grey-500)]" aria-label="Score stable">
        &mdash;
      </span>
    );
  }
  return (
    <span
      className={trend === 'up' ? 'text-[var(--severity-healthy-border)]' : 'text-[var(--severity-high-border)]'}
      aria-label={`Score trending ${trend}`}
    >
      {trend === 'up' ? '\u2191' : '\u2193'}
    </span>
  );
}

export function KeyMetricsCard({ organization }: KeyMetricsCardProps): ReactElement {
  const hasScore = organization.lastScore !== null;

  return (
    <Card className="rounded-lg">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--grey-500)]">
        Key Metrics
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Surveys */}
        <div>
          <p className="text-2xl font-bold text-[var(--grey-900)]">{organization.totalSurveys}</p>
          <p className="mt-1 text-sm text-[var(--grey-500)]">
            Total Survey{organization.totalSurveys !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Culture Score */}
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-bold text-[var(--grey-900)]">
            {hasScore ? organization.lastScore!.toFixed(1) : '\u2014'}
            {hasScore && <TrendIndicator trend={organization.scoreTrend} />}
          </p>
          <p className="mt-1 text-sm text-[var(--grey-500)]">Culture Score</p>
        </div>

        {/* Active Survey */}
        <div>
          {organization.activeSurveyId ? (
            <>
              <p className="text-2xl font-bold text-[var(--severity-healthy-border)]">Active</p>
              <p className="mt-1 truncate text-sm text-[var(--grey-500)]">
                {organization.activeSurveyTitle ?? 'Active Survey'}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--grey-400)]">{'\u2014'}</p>
              <p className="mt-1 text-sm text-[var(--grey-500)]">No Active Survey</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
