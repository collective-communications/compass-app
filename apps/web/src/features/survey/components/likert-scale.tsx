/**
 * Configurable Likert scale component with card-style radio buttons.
 * Renders dynamically from a `scale` prop built via `buildLikertScale(size)`.
 * Supports keyboard selection via number keys (handled by parent hook).
 */
import type { LikertScaleItem, LikertValue } from '@compass/types';

interface LikertScaleProps {
  /** Currently selected value, or undefined if unanswered */
  value: LikertValue | undefined;
  /** Callback when an option is selected */
  onChange: (value: LikertValue) => void;
  /** Unique name for the radio group (question ID) */
  name: string;
  /** Scale items to render (from buildLikertScale) */
  scale: LikertScaleItem[];
}

/** Configurable Likert scale rendered from scale items. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LikertScale({ value, onChange, name, scale }: LikertScaleProps): React.ReactNode {
  return (
    <div role="radiogroup" aria-label="Response options" className="flex flex-col gap-3 md:flex-row">
      {scale.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg border-2 text-sm font-medium transition-colors
              flex items-center gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-0 md:px-3 md:py-4
              ${
                isSelected
                  ? 'border-[var(--grey-700)] bg-[var(--grey-700)] text-white'
                  : 'border-[var(--grey-100)] bg-[var(--grey-50)] text-[var(--grey-700)] hover:border-[var(--grey-400)] hover:bg-[var(--grey-50)]'
              }
              cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)]`}
          >
            {/* Radio circle indicator — visible on mobile, hidden on desktop */}
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 md:hidden
                ${isSelected ? 'border-white' : 'border-[var(--grey-400)]'}`}
            >
              {isSelected && (
                <span className="block size-2 rounded-full bg-white" />
              )}
            </span>
            <span className="flex items-baseline gap-2 md:block">
              <span className="text-xs tabular-nums opacity-60 md:block">{option.value}</span>
              <span className="leading-tight md:mt-1 md:block">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
