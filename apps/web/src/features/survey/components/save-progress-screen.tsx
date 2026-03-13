/**
 * Save progress screen shown when a respondent pauses a survey.
 * Displays remaining count, time estimate, close date, and a
 * link-copy action so the respondent can return later.
 */
import { useCallback, useState, type ReactNode } from 'react';

export interface SaveProgressScreenProps {
  /** Number of questions remaining */
  remainingCount: number;
  /** Estimated minutes to complete remaining questions */
  estimatedMinutes: number;
  /** ISO date string when the survey closes */
  closesAt: string | null;
  /** Number of days until the survey closes */
  daysRemaining: number | null;
  /** Called when the respondent clicks "Continue Survey" */
  onContinue: () => void;
  /** Deployment token used to construct the survey URL */
  deploymentToken: string;
}

/** Format a date string for display */
function formatCloseDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Screen shown when a respondent saves progress, with remaining info and a copy-link action. */
export function SaveProgressScreen({
  remainingCount,
  estimatedMinutes,
  closesAt,
  daysRemaining,
  onContinue,
  deploymentToken,
}: SaveProgressScreenProps): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/s/${deploymentToken}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [deploymentToken]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px] rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 sm:p-8">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--grey-900)]">Progress saved</h1>

        <p className="mb-6 text-[var(--text-secondary)]">
          You can return to this survey anytime on this device.
        </p>

        {/* Remaining info */}
        <div className="mb-6 rounded-lg bg-[var(--grey-50)] px-4 py-3">
          <ul className="space-y-1 text-sm text-[var(--grey-700)]">
            <li>
              {remainingCount} question{remainingCount !== 1 ? 's' : ''} remaining
            </li>
            <li>~{estimatedMinutes} minutes to complete</li>
            {closesAt && (
              <li>
                Survey closes {formatCloseDate(closesAt)}
                {daysRemaining !== null && ` (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`}
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-lg bg-[var(--color-core)] px-6 py-3 text-base font-medium text-white transition-colors hover:opacity-90"
          >
            Continue Survey
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-3 text-base font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-50)]"
          >
            {copied ? 'Link copied' : 'Copy survey link'}
          </button>
        </div>
      </div>
    </div>
  );
}
