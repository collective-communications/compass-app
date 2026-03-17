/**
 * Keyboard shortcut hook for the survey question screen.
 * 1–N: select Likert option (N = scaleSize), Enter: next question, Backspace: previous question.
 * Only active when the question screen container is focused.
 */
import { useEffect } from 'react';
import { DEFAULT_LIKERT_SIZE, type LikertValue } from '@compass/types';

interface UseSurveyKeyboardParams {
  /** Whether the question screen is active/focused */
  isActive: boolean;
  /** Callback when a Likert option is selected via keyboard */
  onSelectOption: (value: LikertValue) => void;
  /** Callback to advance to next question */
  onNext: () => void;
  /** Callback to go to previous question */
  onPrevious: () => void;
  /** Whether the current question has been answered (enables Enter) */
  isAnswered: boolean;
  /** Whether we're on the first question (disables Backspace) */
  isFirst: boolean;
  /** Number of points on the Likert scale (determines valid key range) */
  scaleSize?: number;
}

/** Attach keyboard shortcuts for the survey question flow. */
export function useSurveyKeyboard({
  isActive,
  onSelectOption,
  onNext,
  onPrevious,
  isAnswered,
  isFirst,
  scaleSize = DEFAULT_LIKERT_SIZE,
}: UseSurveyKeyboardParams): void {
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Number keys 1 through scaleSize select Likert options
      const numericValue = Number(event.key);
      if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= scaleSize) {
        onSelectOption(numericValue);
        return;
      }

      switch (event.key) {
        case 'Enter':
          if (isAnswered) {
            event.preventDefault();
            onNext();
          }
          break;
        case 'Backspace':
          if (!isFirst) {
            event.preventDefault();
            onPrevious();
          }
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onSelectOption, onNext, onPrevious, isAnswered, isFirst, scaleSize]);
}
