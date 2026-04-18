import { describe, expect, test } from 'bun:test';
import { formatDisplayDate } from './format-date.js';

describe('formatDisplayDate', () => {
  describe('short format (default)', () => {
    test('formats ISO string with abbreviated month', () => {
      expect(formatDisplayDate('2026-04-16')).toBe('Apr 16, 2026');
    });

    test('defaults to short when no format argument is provided', () => {
      expect(formatDisplayDate('2026-01-05')).toBe(formatDisplayDate('2026-01-05', 'short'));
    });

    test('formats a Date instance', () => {
      const date = new Date('2026-04-16T12:00:00Z');
      expect(formatDisplayDate(date, 'short')).toBe('Apr 16, 2026');
    });
  });

  describe('long format', () => {
    test('formats ISO string with full month name', () => {
      expect(formatDisplayDate('2026-04-16', 'long')).toBe('April 16, 2026');
    });

    test('formats a Date instance with full month name', () => {
      const date = new Date('2026-12-01T00:00:00Z');
      expect(formatDisplayDate(date, 'long')).toBe('December 1, 2026');
    });
  });

  describe('null and undefined input', () => {
    test('returns default "--" for null', () => {
      expect(formatDisplayDate(null)).toBe('--');
    });

    test('returns default "--" for undefined', () => {
      expect(formatDisplayDate(undefined)).toBe('--');
    });

    test('returns default "--" for null with long format', () => {
      expect(formatDisplayDate(null, 'long')).toBe('--');
    });
  });

  describe('invalid input', () => {
    test('returns fallback for unparseable string', () => {
      expect(formatDisplayDate('foo')).toBe('--');
    });

    test('returns fallback for empty string', () => {
      expect(formatDisplayDate('')).toBe('--');
    });

    test('returns fallback for Date constructed from garbage', () => {
      expect(formatDisplayDate(new Date('not-a-date'))).toBe('--');
    });
  });

  describe('locale override', () => {
    test('accepts a custom locale', () => {
      const formatted = formatDisplayDate('2026-04-16', 'long', { locale: 'en-US' });
      expect(formatted).toBe('April 16, 2026');
    });

    test('produces a non-empty string for a different locale', () => {
      const formatted = formatDisplayDate('2026-04-16', 'long', { locale: 'fr-FR' });
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toContain('2026');
    });
  });

  describe('custom nullFallback', () => {
    test('returns custom fallback for null', () => {
      expect(formatDisplayDate(null, 'short', { nullFallback: 'N/A' })).toBe('N/A');
    });

    test('returns custom fallback for undefined', () => {
      expect(formatDisplayDate(undefined, 'short', { nullFallback: '-' })).toBe('-');
    });

    test('returns custom fallback for invalid string', () => {
      expect(formatDisplayDate('nope', 'short', { nullFallback: 'Unknown' })).toBe('Unknown');
    });

    test('allows empty string as fallback', () => {
      expect(formatDisplayDate(null, 'short', { nullFallback: '' })).toBe('');
    });
  });
});
