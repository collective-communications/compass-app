import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderHook } from '@testing-library/react';
import type { LikertValue } from '@compass/types';
import { useSurveyKeyboard } from './use-survey-keyboard.js';

/**
 * Tests for useSurveyKeyboard — verifies Likert number keys (1–N), Enter
 * advances when answered, and Backspace reverts except on the first question.
 * Uses the globally-registered happy-dom `document`.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

interface HookCallbacks {
  onSelectOption: (value: LikertValue) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface RenderOptions extends Partial<HookCallbacks> {
  isActive?: boolean;
  isAnswered?: boolean;
  isFirst?: boolean;
  scaleSize?: number;
}

function makeCallbacks(): HookCallbacks & {
  selectCalls: LikertValue[];
  nextCalls: number;
  previousCalls: number;
} {
  const selectCalls: LikertValue[] = [];
  let nextCalls = 0;
  let previousCalls = 0;
  return {
    onSelectOption: (value: LikertValue) => {
      selectCalls.push(value);
    },
    onNext: () => {
      nextCalls++;
    },
    onPrevious: () => {
      previousCalls++;
    },
    get selectCalls() {
      return selectCalls;
    },
    get nextCalls() {
      return nextCalls;
    },
    get previousCalls() {
      return previousCalls;
    },
  };
}

function dispatchKey(key: string, target?: EventTarget): void {
  const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  if (target) {
    target.dispatchEvent(evt);
  } else {
    document.dispatchEvent(evt);
  }
}

function renderKeyboardHook(options: RenderOptions, callbacks: HookCallbacks) {
  return renderHook(() =>
    useSurveyKeyboard({
      isActive: options.isActive ?? true,
      onSelectOption: callbacks.onSelectOption,
      onNext: callbacks.onNext,
      onPrevious: callbacks.onPrevious,
      isAnswered: options.isAnswered ?? false,
      isFirst: options.isFirst ?? false,
      scaleSize: options.scaleSize,
    }),
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSurveyKeyboard', () => {
  beforeEach(() => {
    // Reset by nothing — each test sets up its own listener.
  });

  test('does not attach listeners when isActive is false', () => {
    const cb = makeCallbacks();
    renderKeyboardHook({ isActive: false }, cb);

    dispatchKey('3');
    dispatchKey('Enter');

    expect(cb.selectCalls).toHaveLength(0);
    expect(cb.nextCalls).toBe(0);
  });

  test('number keys 1–5 map to Likert selection (default scale)', () => {
    const cb = makeCallbacks();
    renderKeyboardHook({ isActive: true }, cb);

    dispatchKey('1');
    dispatchKey('2');
    dispatchKey('3');
    dispatchKey('4');
    dispatchKey('5');

    expect(cb.selectCalls).toEqual([1, 2, 3, 4, 5]);
  });

  test('number keys outside the scale are ignored', () => {
    const cb = makeCallbacks();
    renderKeyboardHook({ isActive: true, scaleSize: 4 }, cb);

    dispatchKey('5');
    dispatchKey('0');
    dispatchKey('9');

    expect(cb.selectCalls).toHaveLength(0);
  });

  test('Enter advances only when isAnswered is true', () => {
    const cb = makeCallbacks();
    const { rerender } = renderHook(
      (props: { isAnswered: boolean }) =>
        useSurveyKeyboard({
          isActive: true,
          onSelectOption: cb.onSelectOption,
          onNext: cb.onNext,
          onPrevious: cb.onPrevious,
          isAnswered: props.isAnswered,
          isFirst: false,
        }),
      { initialProps: { isAnswered: false } },
    );

    dispatchKey('Enter');
    expect(cb.nextCalls).toBe(0);

    rerender({ isAnswered: true });
    dispatchKey('Enter');
    expect(cb.nextCalls).toBe(1);
  });

  test('Backspace goes to previous unless isFirst is true', () => {
    const cb = makeCallbacks();
    const { rerender } = renderHook(
      (props: { isFirst: boolean }) =>
        useSurveyKeyboard({
          isActive: true,
          onSelectOption: cb.onSelectOption,
          onNext: cb.onNext,
          onPrevious: cb.onPrevious,
          isAnswered: true,
          isFirst: props.isFirst,
        }),
      { initialProps: { isFirst: true } },
    );

    dispatchKey('Backspace');
    expect(cb.previousCalls).toBe(0);

    rerender({ isFirst: false });
    dispatchKey('Backspace');
    expect(cb.previousCalls).toBe(1);
  });

  test('ignores keydown when target is INPUT or TEXTAREA', () => {
    const cb = makeCallbacks();
    renderKeyboardHook({ isActive: true, isAnswered: true }, cb);

    const input = document.createElement('input');
    document.body.appendChild(input);
    dispatchKey('3', input);
    dispatchKey('Enter', input);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    dispatchKey('4', textarea);

    expect(cb.selectCalls).toHaveLength(0);
    expect(cb.nextCalls).toBe(0);

    // Clean up DOM nodes we added
    input.remove();
    textarea.remove();
  });

  test('detaches listener on unmount', () => {
    const cb = makeCallbacks();
    const { unmount } = renderKeyboardHook({ isActive: true }, cb);

    dispatchKey('2');
    expect(cb.selectCalls).toEqual([2]);

    unmount();
    dispatchKey('3');
    expect(cb.selectCalls).toEqual([2]);
  });
});

// Keep bun:test mock import referenced to avoid unused-import warnings
// when this file is the sole consumer.
void mock;
