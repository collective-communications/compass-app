/** Screen shown when a survey has been closed */
export interface SurveyClosedScreenProps {
  closedDate?: string | null;
}

export function SurveyClosedScreen({ closedDate }: SurveyClosedScreenProps): React.ReactNode {
  const formatted = closedDate
    ? new Date(closedDate).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="survey-closed">
      <div className="w-full max-w-[600px] rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Survey Closed
        </h1>
        <p className="text-[var(--grey-500)]">
          {formatted
            ? `This survey closed on ${formatted}.`
            : 'This survey is no longer accepting responses.'}
        </p>
      </div>
    </div>
  );
}
