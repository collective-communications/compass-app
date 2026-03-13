/**
 * Thank-you screen displayed after successful survey submission.
 * Shows a confirmation message and a timeline of next steps.
 */
import type { ReactNode } from 'react';
import { TimelineStepper, type TimelineStep } from './timeline-stepper';

const NEXT_STEPS: TimelineStep[] = [
  { title: 'Results compiled', subtitle: 'After the survey closes' },
  { title: 'Leadership review', subtitle: 'Results shared with leadership' },
  { title: 'Organization update', subtitle: 'Key findings shared with team' },
];

export interface ThankYouScreenProps {
  /** Organization website URL. If provided, renders a "Return to [org]" link. */
  organizationUrl?: string | null;
  /** Organization name for the return link label. */
  organizationName?: string;
}

/** Post-submission confirmation with next-steps timeline. */
export function ThankYouScreen({
  organizationUrl,
  organizationName,
}: ThankYouScreenProps): ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px] rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 sm:p-8">
        {/* Checkmark */}
        <div className="mb-4 flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            className="text-[var(--color-core-text)]"
          >
            <circle cx="24" cy="24" r="24" fill="currentColor" opacity="0.1" />
            <path
              d="M15 24.5L21 30.5L33 18.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold text-[var(--grey-900)]">Thank You!</h1>
        <p className="mb-8 text-center text-[var(--text-secondary)]">
          Your responses have been submitted. Here is what happens next:
        </p>

        <TimelineStepper steps={NEXT_STEPS} />

        {organizationUrl && (
          <div className="mt-8 flex justify-center">
            <a
              href={organizationUrl}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-6 py-2.5 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)]"
              rel="noopener noreferrer"
            >
              Return to {organizationName ?? 'organization'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
