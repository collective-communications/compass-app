import { describe, expect, test } from 'bun:test';
import { severitySortKey } from './severity-mapping';
import type { SeverityLevel } from './severity-mapping';

describe('severitySortKey', () => {
  test('critical returns 0 (highest severity, sorts first)', () => {
    expect(severitySortKey('critical')).toBe(0);
  });

  test('high returns 1', () => {
    expect(severitySortKey('high')).toBe(1);
  });

  test('medium returns 2', () => {
    expect(severitySortKey('medium')).toBe(2);
  });

  test('healthy returns 3 (not in SEVERITY_ORDER, falls back to length)', () => {
    expect(severitySortKey('healthy')).toBe(3);
  });

  test('unknown severity falls back to SEVERITY_ORDER.length', () => {
    // Cast to SeverityLevel to test the fallback path
    expect(severitySortKey('unknown' as SeverityLevel)).toBe(3);
  });

  test('sort order: critical < high < medium < healthy', () => {
    const levels: SeverityLevel[] = ['healthy', 'medium', 'critical', 'high'];
    const sorted = [...levels].sort((a, b) => severitySortKey(a) - severitySortKey(b));

    expect(sorted).toEqual(['critical', 'high', 'medium', 'healthy']);
  });
});
