import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LikertScale } from './likert-scale';

function render(value: 1 | 2 | 3 | 4 | undefined) {
  const calls: number[] = [];
  const html = renderToStaticMarkup(
    createElement(LikertScale, {
      value,
      onChange: (v: number) => calls.push(v),
      name: 'q1',
    }),
  );
  return { html, calls };
}

describe('LikertScale', () => {
  test('renders 4 radio buttons', () => {
    const { html } = render(undefined);
    const count = (html.match(/role="radio"/g) ?? []).length;
    expect(count).toBe(4);
  });

  test('renders radiogroup container', () => {
    const { html } = render(undefined);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Response options"');
  });

  test('marks selected value as aria-checked="true"', () => {
    const { html } = render(3);
    // The button for "Agree" (value 3) should be checked
    expect(html).toContain('aria-checked="true"');
    // Count: exactly 1 checked, 3 unchecked
    const checked = (html.match(/aria-checked="true"/g) ?? []).length;
    const unchecked = (html.match(/aria-checked="false"/g) ?? []).length;
    expect(checked).toBe(1);
    expect(unchecked).toBe(3);
  });

  test('no value selected marks all as aria-checked="false"', () => {
    const { html } = render(undefined);
    const checked = (html.match(/aria-checked="true"/g) ?? []).length;
    expect(checked).toBe(0);
  });

  test('renders all four labels', () => {
    const { html } = render(undefined);
    expect(html).toContain('Strongly Disagree');
    expect(html).toContain('Disagree');
    expect(html).toContain('Agree');
    expect(html).toContain('Strongly Agree');
  });

  test('renders number indicators 1-4', () => {
    const { html } = render(undefined);
    for (const n of [1, 2, 3, 4]) {
      expect(html).toContain(`>${n}<`);
    }
  });

  test('applies selected styling class on chosen value', () => {
    const { html } = render(2);
    // Selected button gets the dark background class
    expect(html).toContain('bg-[#0A3B4F] text-white');
  });

  test('sets name attribute on all buttons', () => {
    const { html } = render(undefined);
    const nameCount = (html.match(/name="q1"/g) ?? []).length;
    expect(nameCount).toBe(4);
  });

  test('each button has an aria-label matching its option label', () => {
    const { html } = render(undefined);
    expect(html).toContain('aria-label="Strongly Disagree"');
    expect(html).toContain('aria-label="Disagree"');
    expect(html).toContain('aria-label="Agree"');
    expect(html).toContain('aria-label="Strongly Agree"');
  });
});
