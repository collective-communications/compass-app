/**
 * Previous/Next navigation buttons for the survey question flow.
 * Previous is hidden on the first question.
 * Next is disabled until the current question is answered.
 * On the last Likert question, Next becomes "Continue" to transition to open-ended.
 */

interface QuestionNavButtonsProps {
  /** Whether the Previous button should be visible */
  showPrevious: boolean;
  /** Whether the Next/Continue button should be enabled */
  nextEnabled: boolean;
  /** Whether this is the last Likert question (changes label to "Continue") */
  isLastQuestion: boolean;
  /** Callback for Previous button */
  onPrevious: () => void;
  /** Callback for Next/Continue button */
  onNext: () => void;
}

/** Navigation buttons for question-by-question survey flow. */
export function QuestionNavButtons({
  showPrevious,
  nextEnabled,
  isLastQuestion,
  onPrevious,
  onNext,
}: QuestionNavButtonsProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between">
      <div>
        {showPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-lg border-2 border-[#E5E4E0] bg-white px-6 py-2.5 text-sm font-medium text-[#424242] transition-colors hover:border-[#9E9E9E] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3B4F]"
          >
            Previous
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!nextEnabled}
        className="rounded-lg bg-[#0A3B4F] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A3B4F]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3B4F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLastQuestion ? 'Continue' : 'Next'}
      </button>
    </div>
  );
}
