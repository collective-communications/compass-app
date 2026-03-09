import { describe, expect, test } from 'bun:test';
import { renderCompassToString } from './render-compass-to-string.js';
import type { CompassProps } from './types.js';

const baseProps: CompassProps = {
  scores: [
    { dimension: 'core', score: 75, color: '#0A3B4F', label: 'COLLECTIVE' },
    { dimension: 'clarity', score: 68, color: '#FF7F50', label: 'Clarity' },
    { dimension: 'connection', score: 82, color: '#9FD7C3', label: 'Connection' },
    { dimension: 'collaboration', score: 59, color: '#E8B4A8', label: 'Collaboration' },
  ],
};

describe('Compass accessibility', () => {
  test('SVG has role="img"', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('role="img"');
  });

  test('aria-label includes all dimension scores', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('COLLECTIVE: 75%');
    expect(result).toContain('Clarity: 68%');
    expect(result).toContain('Connection: 82%');
    expect(result).toContain('Collaboration: 59%');
  });

  test('aria-label starts with "Culture Compass scores:"', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('Culture Compass scores:');
  });
});

describe('Compass segment interaction attributes', () => {
  test('segments have role="button"', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('role="button"');
  });

  test('segments have tabIndex for keyboard access', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('tabindex="0"');
  });

  test('each outer segment has aria-label with score', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('aria-label="Clarity: 68%"');
    expect(result).toContain('aria-label="Connection: 82%"');
    expect(result).toContain('aria-label="Collaboration: 59%"');
  });

  test('renders 3 outer segments', () => {
    const result = renderCompassToString(baseProps);
    // 3 outer segments each with role="button"
    const buttonCount = (result.match(/role="button"/g) ?? []).length;
    expect(buttonCount).toBe(3);
  });
});

describe('Compass selected segment', () => {
  test('selected segment stays at full opacity', () => {
    const result = renderCompassToString({
      ...baseProps,
      selectedSegment: 'clarity',
    });
    // Non-selected segments should have reduced opacity
    expect(result).toContain('opacity="0.6"');
  });

  test('no selection means all segments at full opacity', () => {
    const result = renderCompassToString(baseProps);
    // No reduced opacity when nothing is selected
    expect(result).not.toContain('opacity="0.6"');
  });
});

describe('Compass labels', () => {
  test('showLabels=true renders dimension labels', () => {
    const result = renderCompassToString({ ...baseProps, showLabels: true });
    expect(result).toContain('Clarity');
    expect(result).toContain('Connection');
    expect(result).toContain('Collaboration');
  });

  test('showLabels=false renders fewer text elements than showLabels=true', () => {
    const withLabels = renderCompassToString({ ...baseProps, showLabels: true });
    const withoutLabels = renderCompassToString({ ...baseProps, showLabels: false });
    const countWith = (withLabels.match(/<text[^>]*>/g) ?? []).length;
    const countWithout = (withoutLabels.match(/<text[^>]*>/g) ?? []).length;
    expect(countWith).toBeGreaterThan(countWithout);
  });
});
