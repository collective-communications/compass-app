/**
 * Keyboard shortcut hook for the survey question screen.
 * 1-4: select Likert option, Enter: next question, Backspace: previous question.
 * Only active when the question screen container is focused.
 */
import { useEffect } from 'react';
import type { LikertValue } from '@compass/types';

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
}

/** Attach keyboard shortcuts for the survey question flow. */
export function useSurveyKeyboard({
  isActive,
  onSelectOption,
  onNext,
  onPrevious,
  isAnswered,
  isFirst,
}: UseSurveyKeyboardParams): void {
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case '1':
          onSelectOption(1);
          break;
        case '2':
          onSelectOption(2);
          break;
        case '3':
          onSelectOption(3);
          break;
        case '4':
          onSelectOption(4);
          break;
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
  }, [isActive, onSelectOption, onNext, onPrevious, isAnswered, isFirst]);
}
