/**
 * List of previous (closed) surveys for the client dashboard.
 * Each item shows a COMPLETE badge, title, response count, close date, and chevron.
 * Not rendered when there are no previous surveys.
 */

import type { ReactElement } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatDisplayDate } from '@compass/utils';
import type { PreviousSurvey } from '../hooks/use-dashboard-data';

interface PreviousSurveysProps {
  surveys: PreviousSurvey[];
  onSelectSurvey: (surveyId: string) => void;
}

export function PreviousSurveys({ surveys, onSelectSurvey }: PreviousSurveysProps): ReactElement {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-[var(--grey-900)]">Previous Surveys</h2>
      <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:overflow-x-auto md:pb-2">
        {surveys.map((item) => (
          <button
            key={item.survey.id}
            type="button"
            onClick={() => onSelectSurvey(item.survey.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-4 text-left transition-shadow hover:shadow-md md:w-[300px] md:shrink-0"
          >
            <span className="shrink-0 rounded-full bg-[var(--grey-500)] px-3 py-1 text-xs font-semibold uppercase text-[var(--grey-50)]">
              Complete
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--grey-900)]">
                {item.survey.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {item.responseCount} responses &middot; Closed {formatDisplayDate(item.closedAt, 'long')}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
