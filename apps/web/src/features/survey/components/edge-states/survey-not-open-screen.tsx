/** Screen shown when a survey has not opened yet */
export interface SurveyNotOpenScreenProps {
  opensDate?: string | null;
}

export function SurveyNotOpenScreen({ opensDate }: SurveyNotOpenScreenProps): React.ReactNode {
  const formatted = opensDate
    ? new Date(opensDate).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="survey-not-open">
      <div className="w-full max-w-md rounded-xl border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Survey Not Yet Open
        </h1>
        <p className="text-[#616161]">
          {formatted
            ? `This survey opens on ${formatted}.`
            : 'This survey is not yet accepting responses.'}
        </p>
      </div>
    </div>
  );
}
