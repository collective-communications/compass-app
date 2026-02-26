/**
 * Welcome back screen shown when a respondent returns to a partially
 * completed survey. Displays progress summary and a resume button.
 */
import type { ReactNode } from 'react';

export interface WelcomeBackScreenProps {
  /** Number of questions already answered */
  answeredCount: number;
  /** Total questions in the survey */
  totalCount: number;
  /** 1-based index of the first unanswered question */
  resumeIndex: number;
  /** Called when the respondent clicks "Resume Survey" */
  onResume: () => void;
  /** Whether the resume action is in progress */
  isLoading: boolean;
}

/** Screen shown to returning respondents with a progress summary and resume action. */
export function WelcomeBackScreen({
  answeredCount,
  totalCount,
  onResume,
  isLoading,
}: WelcomeBackScreenProps): ReactNode {
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px] rounded-xl border border-[#E5E4E0] bg-white p-6 sm:p-8">
        <h1 className="mb-2 text-2xl font-semibold text-[#212121]">Welcome back!</h1>

        <p className="mb-6 text-[#616161]">
          {answeredCount} of {totalCount} questions completed
        </p>

        {/* Progress bar */}
        <div
          className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[#E5E4E0]"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% complete`}
        >
          <div
            className="h-full rounded-full bg-[#0A3B4F] transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onResume}
          disabled={isLoading}
          className="w-full rounded-lg bg-[#0A3B4F] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#0A3B4F]/90 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Resuming...
            </span>
          ) : (
            'Resume Survey'
          )}
        </button>
      </div>
    </div>
  );
}
