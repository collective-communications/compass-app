/**
 * Previous/Next navigation buttons for the survey question flow.
 * Previous is always visible but disabled on the first question.
 * Next is disabled until the current question is answered.
 * On the last Likert question, Next becomes "Continue" to transition to open-ended.
 */

interface QuestionNavButtonsProps {
  /** Whether this is the first question (disables Previous) */
  isFirst: boolean;
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
  isFirst,
  nextEnabled,
  isLastQuestion,
  onPrevious,
  onNext,
}: QuestionNavButtonsProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirst}
        className="rounded-lg border-2 border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-2.5 text-sm font-medium text-[var(--grey-700)] transition-colors hover:border-[var(--grey-400)] hover:bg-[var(--grey-50)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!nextEnabled}
        className="rounded-lg bg-[var(--color-interactive)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLastQuestion ? 'Continue' : 'Next'}
      </button>
    </div>
  );
}
