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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[#E5E4E0] bg-white p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[#212121]">
          Survey Closed
        </h1>
        <p className="text-[#616161]">
          {formatted
            ? `This survey closed on ${formatted}.`
            : 'This survey is no longer accepting responses.'}
        </p>
      </div>
    </div>
  );
}
