import { describe, expect, test } from 'bun:test';
import { renderCompassToString } from './render-compass-to-string.js';
import type { CompassProps } from './types.js';

const baseProps: CompassProps = {
  scores: [
    { dimension: 'core', score: 75, color: '#0C3D50', label: 'COLLECTIVE' },
    { dimension: 'clarity', score: 68, color: '#FF7F50', label: 'Clarity' },
    { dimension: 'connection', score: 82, color: '#9FD7C3', label: 'Connection' },
    { dimension: 'collaboration', score: 59, color: '#E8B4A8', label: 'Collaboration' },
  ],
};

describe('renderCompassToString', () => {
  test('returns a string starting with <svg', () => {
    const result = renderCompassToString(baseProps);
    expect(result.startsWith('<svg')).toBe(true);
  });

  test('contains aria-label', () => {
    const result = renderCompassToString(baseProps);
    expect(result).toContain('aria-label');
  });

  test('contains dimension labels when showLabels is true', () => {
    const result = renderCompassToString({ ...baseProps, showLabels: true });
    expect(result).toContain('Clarity');
    expect(result).toContain('Connection');
    expect(result).toContain('Collaboration');
  });

  test('forces animated=false (no animation classes)', () => {
    const result = renderCompassToString({ ...baseProps, animated: true });
    // Static markup should not contain animation-related attributes
    expect(result).not.toContain('animate');
  });
});
