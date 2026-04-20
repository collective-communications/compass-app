import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Compass } from './Compass.js';
import type { DimensionScore } from './types.js';

const TEST_SCORES: DimensionScore[] = [
  { dimension: 'core', score: 75, color: '#0C3D50', label: 'COLLECTIVE' },
  { dimension: 'clarity', score: 60, color: '#FF7F50', label: 'Clarity' },
  { dimension: 'connection', score: 85, color: '#9FD7C3', label: 'Connection' },
  { dimension: 'collaboration', score: 45, color: '#E8B4A8', label: 'Collaboration' },
];

function render(props: Partial<Parameters<typeof Compass>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(Compass, { scores: TEST_SCORES, ...props }),
  );
}

describe('Compass component — score-driven rendering', () => {
  test('renders SVG with role="group"', () => {
    expect(render()).toContain('role="group"');
  });

  test('aria-label includes "Culture Compass scores:" prefix', () => {
    expect(render()).toContain('Culture Compass scores:');
  });

  test('aria-label includes all dimension scores', () => {
    const html = render();
    expect(html).toContain('COLLECTIVE: 75%');
    expect(html).toContain('Clarity: 60%');
    expect(html).toContain('Connection: 85%');
    expect(html).toContain('Collaboration: 45%');
  });

  test('renders 3 outer segments with role="button"', () => {
    const html = render();
    const buttonCount = (html.match(/role="button"/g) ?? []).length;
    expect(buttonCount).toBe(3);
  });

  test('each outer segment has aria-label with dimension name and score', () => {
    const html = render();
    expect(html).toContain('aria-label="Clarity: 60%"');
    expect(html).toContain('aria-label="Connection: 85%"');
    expect(html).toContain('aria-label="Collaboration: 45%"');
  });

  test('segments have tabindex="0" for keyboard navigation', () => {
    const html = render();
    const tabCount = (html.match(/tabindex="0"/g) ?? []).length;
    expect(tabCount).toBeGreaterThanOrEqual(3);
  });
});

describe('Compass component — segment selection', () => {
  test('selected segment stays at full opacity, others dim', () => {
    const html = render({ selectedSegment: 'clarity' });
    expect(html).toContain('opacity="0.6"');
  });

  test('no selection means all segments at full opacity', () => {
    const html = render();
    expect(html).not.toContain('opacity="0.6"');
  });
});

describe('Compass component — boundary scores', () => {
  test('renders with zero scores without error', () => {
    const zeroScores: DimensionScore[] = TEST_SCORES.map((s) => ({ ...s, score: 0 }));
    const html = renderToStaticMarkup(
      createElement(Compass, { scores: zeroScores }),
    );
    expect(html).toContain('role="group"');
  });

  test('renders with maximum scores without error', () => {
    const maxScores: DimensionScore[] = TEST_SCORES.map((s) => ({ ...s, score: 100 }));
    const html = renderToStaticMarkup(
      createElement(Compass, { scores: maxScores }),
    );
    expect(html).toContain('role="group"');
  });
});

describe('Compass component — labels', () => {
  test('showLabels=true renders dimension label text', () => {
    const html = render({ showLabels: true });
    expect(html).toContain('Clarity');
    expect(html).toContain('Connection');
    expect(html).toContain('Collaboration');
  });

  test('showLabels=false produces fewer text elements', () => {
    const withLabels = render({ showLabels: true });
    const withoutLabels = render({ showLabels: false });
    const countWith = (withLabels.match(/<text[^>]*>/g) ?? []).length;
    const countWithout = (withoutLabels.match(/<text[^>]*>/g) ?? []).length;
    expect(countWith).toBeGreaterThan(countWithout);
  });
});
