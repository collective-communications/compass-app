/**
 * Generating state panel for the export modal.
 * Circular progress spinner with step indicators.
 */

import type { ReactElement } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GENERATION_STEPS } from './export-modal-utils';

interface ExportGeneratingPanelProps {
  progress: number;
  currentStep: number;
}

export function ExportGeneratingPanel({
  progress,
  currentStep,
}: ExportGeneratingPanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Circular spinner */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative h-20 w-20">
          {/* Background circle */}
          <svg className="h-20 w-20" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--grey-100)"
              strokeWidth="6"
            />
            {/* Progress arc */}
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--grey-700)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--grey-700)]">
            {progress}%
          </span>
        </div>
        <span className="text-sm font-medium text-[var(--grey-700)]">
          Generating report
        </span>
      </div>

      {/* Step indicators */}
      <ol className="flex flex-col gap-3">
        {GENERATION_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;

          return (
            <li key={step.label} className="flex items-center gap-3">
              <div
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                  isDone
                    ? 'bg-[var(--severity-healthy-text)] text-white'
                    : isActive
                      ? 'bg-[var(--grey-700)] text-white'
                      : 'bg-[var(--grey-50)] text-[var(--text-tertiary)]',
                ].join(' ')}
              >
                {isDone ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : isActive ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? 'text-[var(--severity-healthy-text)]'
                    : isActive
                      ? 'font-medium text-[var(--grey-700)]'
                      : 'text-[var(--text-tertiary)]'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
