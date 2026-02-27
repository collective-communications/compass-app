/**
 * 4-point Likert scale component with card-style radio buttons.
 * No neutral option — forces respondents to take a position.
 * Supports keyboard selection via number keys (handled by parent hook).
 */
import { LIKERT_SCALE, type LikertValue } from '@compass/types';

interface LikertScaleProps {
  /** Currently selected value, or undefined if unanswered */
  value: LikertValue | undefined;
  /** Callback when an option is selected */
  onChange: (value: LikertValue) => void;
  /** Unique name for the radio group (question ID) */
  name: string;
}

/** 4-point Likert scale: Strongly Disagree(1), Disagree(2), Agree(3), Strongly Agree(4) */
export function LikertScale({ value, onChange, name }: LikertScaleProps): React.ReactNode {
  return (
    <div role="radiogroup" aria-label="Response options" className="flex gap-3">
      {LIKERT_SCALE.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            name={name}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg border-2 px-3 py-4 text-sm font-medium transition-colors
              ${
                isSelected
                  ? 'border-[#0A3B4F] bg-[#0A3B4F] text-white'
                  : 'border-[var(--grey-100)] bg-[var(--grey-50)] text-[var(--grey-700)] hover:border-[var(--grey-400)] hover:bg-[var(--grey-50)]'
              }
              cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3B4F]`}
          >
            <span className="block text-xs tabular-nums opacity-60">{option.value}</span>
            <span className="mt-1 block leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
