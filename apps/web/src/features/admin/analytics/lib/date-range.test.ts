import { describe, expect, test } from 'bun:test';
import {
  formatLocalDate,
  getInclusiveDates,
  getPresetDateRange,
  isValidDateRange,
} from './date-range';

describe('analytics date range helpers', () => {
  test('formats local date inputs as date-only strings', () => {
    expect(formatLocalDate(new Date(2026, 3, 29))).toBe('2026-04-29');
  });

  test('builds inclusive preset ranges', () => {
    expect(getPresetDateRange('7', new Date(2026, 3, 29))).toEqual({
      startDate: '2026-04-23',
      endDate: '2026-04-29',
      preset: '7',
    });
  });

  test('validates date order and date shape', () => {
    expect(isValidDateRange('2026-04-01', '2026-04-29')).toBe(true);
    expect(isValidDateRange('2026-04-30', '2026-04-29')).toBe(false);
    expect(isValidDateRange('2026-02-31', '2026-04-29')).toBe(false);
  });

  test('returns inclusive date lists', () => {
    expect(getInclusiveDates('2026-04-27', '2026-04-29')).toEqual([
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
    ]);
  });
});
