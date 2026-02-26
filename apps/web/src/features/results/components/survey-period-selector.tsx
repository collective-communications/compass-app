/**
 * Dropdown for switching between historical survey periods.
 * Only displays closed/archived surveys, ordered by close date descending.
 */

import type { ReactElement } from 'react';

interface SurveyPeriod {
  id: string;
  title: string;
  closesAt: string;
}

interface SurveyPeriodSelectorProps {
  surveys: SurveyPeriod[];
  selectedId: string;
  onSelect: (surveyId: string) => void;
}

/** Format a date string as "MMM YYYY" for display in dropdown options. */
function formatCloseDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

export function SurveyPeriodSelector({
  surveys,
  selectedId,
  onSelect,
}: SurveyPeriodSelectorProps): ReactElement {
  const sorted = [...surveys].sort(
    (a, b) => new Date(b.closesAt).getTime() - new Date(a.closesAt).getTime(),
  );

  return (
    <select
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select survey period"
      className="h-10 w-64 rounded-md border border-[#E5E4E0] bg-white px-3 text-sm text-[#424242] focus:outline-none focus:ring-2 focus:ring-[#0A3B4F]"
    >
      {sorted.map((survey) => (
        <option key={survey.id} value={survey.id}>
          {survey.title} — {formatCloseDate(survey.closesAt)}
        </option>
      ))}
    </select>
  );
}
