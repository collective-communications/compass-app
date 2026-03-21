/**
 * Key metrics summary card for the client detail page.
 * Displays total surveys, culture score with trend, and active survey status.
 * Stats are clickable when navigation callbacks are provided.
 */

import type { ReactElement } from 'react';
import type { OrganizationSummary } from '@compass/types';
import { Card } from '../../../../components/ui/card';

export interface KeyMetricsCardProps {
  organization: OrganizationSummary;
  onTotalSurveysClick?: () => void;
  onActiveSurveyClick?: (surveyId: string) => void;
}

/** Trend arrow with color coding */
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' | null }): ReactElement | null {
  if (!trend) return null;
  if (trend === 'stable') {
    return (
      <span className="text-[var(--text-secondary)]" aria-label="Score stable">
        &mdash;
      </span>
    );
  }
  return (
    <span
      className={trend === 'up' ? 'text-[var(--severity-healthy-text)]' : 'text-[var(--severity-high-text)]'}
      aria-label={`Score trending ${trend}`}
    >
      {trend === 'up' ? '\u2191' : '\u2193'}
    </span>
  );
}

export function KeyMetricsCard({ organization, onTotalSurveysClick, onActiveSurveyClick }: KeyMetricsCardProps): ReactElement {
  const hasScore = organization.lastScore !== null;

  return (
    <Card className="rounded-lg">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Key Metrics
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Surveys */}
        <div>
          {onTotalSurveysClick ? (
            <button
              type="button"
              onClick={onTotalSurveysClick}
              className="text-left transition-colors hover:text-[var(--color-core)]"
            >
              <p className="text-2xl font-bold text-[var(--grey-900)]">{organization.totalSurveys}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)] underline underline-offset-2">
                Total Survey{organization.totalSurveys !== 1 ? 's' : ''}
              </p>
            </button>
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--grey-900)]">{organization.totalSurveys}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Total Survey{organization.totalSurveys !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>

        {/* Culture Score */}
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-bold text-[var(--grey-900)]">
            {hasScore ? organization.lastScore!.toFixed(1) : '\u2014'}
            {hasScore && <TrendIndicator trend={organization.scoreTrend} />}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Culture Score</p>
        </div>

        {/* Active Survey */}
        <div>
          {organization.activeSurveyId ? (
            onActiveSurveyClick ? (
              <button
                type="button"
                onClick={() => onActiveSurveyClick(organization.activeSurveyId!)}
                className="text-left transition-colors hover:text-[var(--color-core)]"
              >
                <p className="text-2xl font-bold text-[var(--severity-healthy-text)]">Active</p>
                <p className="mt-1 truncate text-sm text-[var(--text-secondary)] underline underline-offset-2">
                  {organization.activeSurveyTitle ?? 'Active Survey'}
                </p>
              </button>
            ) : (
              <>
                <p className="text-2xl font-bold text-[var(--severity-healthy-text)]">Active</p>
                <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                  {organization.activeSurveyTitle ?? 'Active Survey'}
                </p>
              </>
            )
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--text-tertiary)]">{'\u2014'}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">No Active Survey</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
