/**
 * Vertical timeline stepper for the thank-you screen.
 * Pure presentational component displaying ordered steps with titles and subtitles.
 */
import type { ReactNode } from 'react';

export interface TimelineStep {
  title: string;
  subtitle: string;
}

export interface TimelineStepperProps {
  steps: TimelineStep[];
}

/** Renders a vertical stepper with connecting lines between steps. */
export function TimelineStepper({ steps }: TimelineStepperProps): ReactNode {
  return (
    <ol className="relative ml-3" aria-label="Next steps timeline">
      {steps.map((step, index) => (
        <li key={index} className="relative pb-8 pl-8 last:pb-0">
          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div
              className="absolute left-[7px] top-4 h-full w-px bg-[var(--grey-100)]"
              aria-hidden="true"
            />
          )}
          {/* Step circle */}
          <div
            className="absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-[var(--grey-400)] bg-[var(--grey-50)]"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-[var(--grey-900)]">{step.title}</p>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{step.subtitle}</p>
        </li>
      ))}
    </ol>
  );
}
