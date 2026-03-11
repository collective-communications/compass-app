import { describe, test, expect } from 'bun:test';
import { escapeHtml, getDimensionColor, BRAND } from './_lib';

describe('getDimensionColor', () => {
  test('clarity returns correct hex', () => {
    expect(getDimensionColor('clarity')).toBe('#FF7F50');
  });

  test('connection returns correct hex', () => {
    expect(getDimensionColor('connection')).toBe('#9FD7C3');
  });

  test('collaboration returns correct hex', () => {
    expect(getDimensionColor('collaboration')).toBe('#E8B4A8');
  });

  test('core dimensions return BRAND.core', () => {
    expect(getDimensionColor('culture')).toBe(BRAND.core);
    expect(getDimensionColor('communication')).toBe(BRAND.core);
    expect(getDimensionColor('community')).toBe(BRAND.core);
  });

  test('unknown code falls back to BRAND.core', () => {
    expect(getDimensionColor('nonexistent')).toBe(BRAND.core);
  });
});

describe('escapeHtml', () => {
  test('XSS payload is fully escaped', () => {
    const result = escapeHtml('<img onerror=alert(1)>');
    expect(result).toBe('&lt;img onerror=alert(1)&gt;');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});
