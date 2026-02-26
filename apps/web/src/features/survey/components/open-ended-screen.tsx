/**
 * Open-ended feedback screen shown after all Likert questions.
 * Provides optional free-text input with character limit before submission.
 */
import { useState, type ReactNode } from 'react';

const MAX_CHARS = 2000;

export interface OpenEndedScreenProps {
  /** Prompt text displayed above the textarea */
  prompt: string;
  /** Whether the submission is currently in progress */
  isSubmitting: boolean;
  /** Called when the respondent submits with their feedback text */
  onSubmit: (text: string) => void;
  /** Called when the respondent skips the open-ended question */
  onSkip: () => void;
}

/** Optional open-ended feedback screen with character-limited textarea. */
export function OpenEndedScreen({
  prompt,
  isSubmitting,
  onSubmit,
  onSkip,
}: OpenEndedScreenProps): ReactNode {
  const [text, setText] = useState('');

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px] rounded-xl border border-[#E5E4E0] bg-white p-6 sm:p-8">
        <h2 className="mb-2 text-xl font-semibold text-[#212121]">One more thing...</h2>
        <p className="mb-4 text-[#616161]">{prompt}</p>

        <div className="mb-2">
          <textarea
            className="w-full resize-y rounded-lg border border-[#E5E4E0] bg-white px-4 py-3 text-[#212121] placeholder-[#9E9E9E] transition-colors focus:border-[#0A3B4F] focus:outline-none"
            rows={5}
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts... (optional)"
            disabled={isSubmitting}
            aria-label="Open-ended feedback"
          />
          <p className="text-right text-xs text-[#9E9E9E]" aria-live="polite">
            {text.length} / {MAX_CHARS}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm font-medium text-[#424242] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSubmit(text)}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-[#0A3B4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A3B4F]/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      </div>
    </div>
  );
}
