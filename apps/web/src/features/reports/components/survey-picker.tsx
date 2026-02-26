/**
 * Survey dropdown for the reports page.
 * Allows selecting which survey's reports to view.
 */

import type { ReactElement } from 'react';

export interface ReportSurveyOption {
  id: string;
  title: string;
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
      <div className="h-10 w-64 animate-pulse rounded-md bg-[#E5E4E0]" />
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="h-10 w-64 rounded-md border border-[#E5E4E0] bg-[#F5F5F5] px-3 py-2 text-sm text-[#9E9E9E]">
        No surveys available
      </div>
    );
  }

  return (
    <select
      value={activeSurveyId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select a survey to view reports"
      className="h-10 w-64 rounded-md border border-[#E5E4E0] bg-white px-3 text-sm text-[#424242] focus:outline-none focus:ring-2 focus:ring-[#0A3B4F]"
    >
      {surveys.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title}
        </option>
      ))}
    </select>
  );
}
