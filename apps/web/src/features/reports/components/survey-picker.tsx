/**
 * Survey dropdown for the reports page.
 * Allows selecting which survey's reports to view.
 */

import type { ReactElement } from 'react';

export interface ReportSurveyOption {
  id: string;
  title: string;
  /** Survey lifecycle status — used to group reports into active vs previous */
  status?: 'active' | 'completed' | 'closed';
}

interface SurveyPickerProps {
  surveys: ReportSurveyOption[];
  activeSurveyId: string | null;
  onSelect: (surveyId: string) => void;
  isLoading?: boolean;
}

export function SurveyPicker({
  surveys,
  activeSurveyId,
  onSelect,
  isLoading = false,
}: SurveyPickerProps): ReactElement {
  if (isLoading) {
    return (
      <div className="h-10 w-64 animate-pulse rounded-md bg-[var(--grey-100)]" />
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="h-10 w-64 rounded-md border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 py-2 text-sm text-[var(--grey-400)]">
        No surveys available
      </div>
    );
  }

  return (
    <select
      value={activeSurveyId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select a survey to view reports"
      className="h-10 w-64 rounded-md border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 text-sm text-[var(--grey-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]"
    >
      {surveys.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title}
        </option>
      ))}
    </select>
  );
}
