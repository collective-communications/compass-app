import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressSquares } from './progress-squares';

function render(opts: { total: number; currentIndex: number; answered: number[] }) {
  const calls: number[] = [];
  const html = renderToStaticMarkup(
    createElement(ProgressSquares, {
      total: opts.total,
      currentIndex: opts.currentIndex,
      answeredIndices: new Set(opts.answered),
      onJump: (i: number) => calls.push(i),
    }),
  );
  return { html, calls };
}

describe('ProgressSquares', () => {
  test('renders correct number of buttons', () => {
    const { html } = render({ total: 10, currentIndex: 0, answered: [] });
    const count = (html.match(/<button/g) ?? []).length;
    expect(count).toBe(10);
  });

  test('renders group with aria-label', () => {
    const { html } = render({ total: 5, currentIndex: 0, answered: [] });
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Survey progress"');
  });

  test('current question has "current" in aria-label', () => {
    const { html } = render({ total: 5, currentIndex: 2, answered: [] });
    expect(html).toContain('Question 3 of 5, current');
  });

  test('answered question has "answered" in aria-label', () => {
    const { html } = render({ total: 5, currentIndex: 0, answered: [1, 3] });
    expect(html).toContain('Question 2 of 5, answered');
    expect(html).toContain('Question 4 of 5, answered');
  });

  test('unanswered non-current question has "unanswered" in aria-label', () => {
    const { html } = render({ total: 3, currentIndex: 0, answered: [] });
    expect(html).toContain('Question 2 of 3, unanswered');
    expect(html).toContain('Question 3 of 3, unanswered');
  });

  test('current square gets ring styling', () => {
    const { html } = render({ total: 3, currentIndex: 1, answered: [] });
    // Current square has the ring class for visual emphasis
    expect(html).toContain('ring-2');
  });

  test('answered square gets filled background', () => {
    const { html } = render({ total: 3, currentIndex: 0, answered: [1] });
    // Answered squares use the dark fill
    expect(html).toContain('bg-[#0A3B4F]');
  });

  test('handles empty survey (0 answered)', () => {
    const { html } = render({ total: 5, currentIndex: 0, answered: [] });
    // Only the current square should be dark
    const darkSquares = (html.match(/bg-\[#0A3B4F\]/g) ?? []).length;
    // current square is dark
    expect(darkSquares).toBe(1);
  });

  test('handles fully answered survey', () => {
    const { html } = render({ total: 3, currentIndex: 2, answered: [0, 1, 2] });
    const darkSquares = (html.match(/bg-\[#0A3B4F\]/g) ?? []).length;
    // All 3 squares should be dark (answered or current)
    expect(darkSquares).toBe(3);
  });
});
