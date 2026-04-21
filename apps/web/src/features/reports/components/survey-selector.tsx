/**
 * Survey selector for the reports page.
 *
 * Thin wrapper around the dropdown control that delegates the empty-state
 * UI to the parent via an `emptyState` prop. The parent decides whether
 * to render the "No surveys available" banner, suppress it entirely, or
 * substitute its own copy — useful when a survey is pinned in the URL
 * and the parent already knows reports will render below.
 */

import type { ReactElement, ReactNode } from 'react';
import type { ReportSurveyOption } from './survey-picker';

interface SurveySelectorProps {
  /** All surveys available to pick from. */
  surveys: ReportSurveyOption[];
  /** Currently selected survey id (or null when nothing is selected yet). */
  selectedId: string | null;
  /** Invoked with the new id when the person picks a different survey. */
  onSelect: (surveyId: string) => void;
  /** Whether the surveys list is still loading. Shows a skeleton when true. */
  isLoading?: boolean;
  /**
   * What to render when `surveys` is empty. Pass a node to show a banner;
   * pass `null` (or omit) to render nothing at all.
   */
  emptyState?: ReactNode;
}

/**
 * Dropdown selector for the reports page. The empty-state rendering is
 * owned by the parent via `emptyState`, so callers can conditionally
 * suppress the banner (e.g. when a survey id is pinned in the URL and
 * reports will still render below).
 */
export function SurveySelector({
  surveys,
  selectedId,
  onSelect,
  isLoading = false,
  emptyState = null,
}: SurveySelectorProps): ReactElement | null {
  if (isLoading) {
    return (
      <div className="h-10 w-64 animate-pulse rounded-md bg-[var(--grey-100)]" />
    );
  }

  if (surveys.length === 0) {
    return emptyState === null || emptyState === undefined ? null : <>{emptyState}</>;
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select a survey to view reports"
      className="h-10 w-64 rounded-md border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 text-sm text-[var(--grey-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]"
    >
      {surveys.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title}
        </option>
      ))}
    </select>
  );
}
