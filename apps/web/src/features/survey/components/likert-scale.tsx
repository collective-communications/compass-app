/**
 * Configurable Likert scale component with card-style radio buttons.
 * Renders dynamically from a `scale` prop built via `buildLikertScale(size)`.
 *
 * Implements the WAI-ARIA radio group keyboard pattern:
 *   - ArrowLeft / ArrowUp  — select previous option and move focus to it
 *   - ArrowRight / ArrowDown — select next option and move focus to it
 *   - Home — select first option and move focus to it
 *   - End — select last option and move focus to it
 *
 * Roving tabIndex: exactly one button is tabbable at a time. The selected
 * option owns `tabIndex=0`; when nothing is selected, the first option does.
 *
 * Number-key shortcuts (1–N) continue to be handled at document level by the
 * parent `useSurveyKeyboard` hook — they work regardless of which element has
 * focus, so this component's arrow handling does not interfere.
 */
import { useEffect, useRef, type KeyboardEvent } from 'react';
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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /** Tracks whether focus should move to the selected option after the next render. */
  const focusOnNextRenderRef = useRef(false);

  // After a keyboard-initiated selection, move DOM focus to the newly
  // selected option so the roving tabIndex visibly follows the user.
  useEffect(() => {
    if (!focusOnNextRenderRef.current) return;
    focusOnNextRenderRef.current = false;

    const selectedIndex = scale.findIndex((item) => item.value === value);
    if (selectedIndex >= 0) {
      buttonRefs.current[selectedIndex]?.focus();
    }
  }, [value, scale]);

  const currentIndex = value === undefined ? -1 : scale.findIndex((item) => item.value === value);

  /** Move selection by `delta` (with wrap) and focus the newly selected option. */
  function moveSelection(delta: number): void {
    if (scale.length === 0) return;
    // If nothing is selected yet, start from the first option for "next" and
    // last option for "previous" — mirrors native <input type="radio"> groups.
    const baseIndex = currentIndex === -1 ? (delta > 0 ? 0 : scale.length - 1) : currentIndex;
    const nextIndex =
      currentIndex === -1 ? baseIndex : (baseIndex + delta + scale.length) % scale.length;
    const nextItem = scale[nextIndex];
    if (!nextItem) return;
    focusOnNextRenderRef.current = true;
    onChange(nextItem.value);
  }

  function moveToIndex(index: number): void {
    const item = scale[index];
    if (!item) return;
    focusOnNextRenderRef.current = true;
    onChange(item.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveSelection(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveSelection(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveToIndex(0);
        break;
      case 'End':
        event.preventDefault();
        moveToIndex(scale.length - 1);
        break;
      default:
        // Let number keys, Enter, Tab, etc. propagate to document-level
        // handlers (see use-survey-keyboard.ts).
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Response options"
      className="flex flex-col gap-3 md:flex-row"
    >
      {scale.map((option, index) => {
        const isSelected = value === option.value;
        // Roving tabIndex: the selected option is tabbable. If nothing is
        // selected yet, only the first option is tabbable so Tab reaches the
        // group once.
        const isTabbable = currentIndex === -1 ? index === 0 : isSelected;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            tabIndex={isTabbable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
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
