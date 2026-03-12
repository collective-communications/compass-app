/**
 * Org-scoped survey dropdown for selecting which scored survey to view.
 * Only shows surveys where scores have been calculated.
 */

import type { ReactElement } from 'react';
import type { ScoredSurvey } from '../types';

interface SurveyPickerProps {
  surveys: ScoredSurvey[];
  activeSurveyId: string;
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

  return (
    <select
      value={activeSurveyId}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select a survey to view results"
      className="h-10 w-64 rounded-md border border-[var(--grey-100)] bg-[var(--grey-50)] px-3 text-sm text-[var(--grey-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core)]"
    >
      {surveys.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title}
        </option>
      ))}
    </select>
  );
}
