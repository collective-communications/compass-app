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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[#E5E4E0] bg-white p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[#212121]">
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
