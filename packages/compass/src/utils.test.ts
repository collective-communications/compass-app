import { describe, expect, test } from 'bun:test';
import { polarToCartesian, describeArc, clampScore } from './utils.js';

describe('polarToCartesian', () => {
  const cx = 100;
  const cy = 100;
  const r = 50;

  test('0 degrees is top of circle', () => {
    const result = polarToCartesian(cx, cy, r, 0);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(50);
  });

  test('90 degrees is right of circle', () => {
    const result = polarToCartesian(cx, cy, r, 90);
    expect(result.x).toBeCloseTo(150);
    expect(result.y).toBeCloseTo(100);
  });

  test('180 degrees is bottom of circle', () => {
    const result = polarToCartesian(cx, cy, r, 180);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(150);
  });

  test('270 degrees is left of circle', () => {
    const result = polarToCartesian(cx, cy, r, 270);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(100);
  });

  test('works with different center and radius', () => {
    const result = polarToCartesian(0, 0, 10, 0);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-10);
  });
});

describe('describeArc', () => {
  test('starts with M and ends with Z', () => {
    const path = describeArc(100, 100, 50, 0, 90);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  test('contains arc command A', () => {
    const path = describeArc(100, 100, 50, 0, 90);
    expect(path).toContain('A');
  });

  test('contains line command L', () => {
    const path = describeArc(100, 100, 50, 0, 90);
    expect(path).toContain('L');
  });

  test('handles wrap-around (330 to 90)', () => {
    const path = describeArc(100, 100, 50, 330, 90);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('A');
  });

  test('large arc flag is 0 for sweep <= 180', () => {
    const path = describeArc(100, 100, 50, 0, 120);
    // Arc command: A radius radius 0 largeArcFlag 1 ...
    expect(path).toMatch(/A 50 50 0 0 1/);
  });

  test('large arc flag is 1 for sweep > 180', () => {
    const path = describeArc(100, 100, 50, 0, 270);
    expect(path).toMatch(/A 50 50 0 1 1/);
  });

  test('wrap-around sets large arc flag correctly', () => {
    // 330 to 90 = sweep of 120 (normalized via +360: -240+360=120)
    const path = describeArc(100, 100, 50, 330, 90);
    expect(path).toMatch(/A 50 50 0 0 1/);
  });
});

describe('clampScore', () => {
  test('values within range are unchanged', () => {
    expect(clampScore(0)).toBe(0);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(100)).toBe(100);
  });

  test('negative values clamp to 0', () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(-999)).toBe(0);
  });

  test('values above 100 clamp to 100', () => {
    expect(clampScore(101)).toBe(100);
    expect(clampScore(999)).toBe(100);
  });
});
