import { describe, expect, test } from 'bun:test';
import {
  SEGMENT_ANGLES,
  DEFAULT_SIZE,
  CORE_RADIUS_RATIO,
} from './constants.js';

describe('SEGMENT_ANGLES', () => {
  test('has all three outer dimensions', () => {
    expect(SEGMENT_ANGLES).toHaveProperty('clarity');
    expect(SEGMENT_ANGLES).toHaveProperty('connection');
    expect(SEGMENT_ANGLES).toHaveProperty('collaboration');
  });

  test('each segment has start and end angles', () => {
    for (const key of ['clarity', 'connection', 'collaboration'] as const) {
      expect(typeof SEGMENT_ANGLES[key].start).toBe('number');
      expect(typeof SEGMENT_ANGLES[key].end).toBe('number');
    }
  });
});

describe('constants', () => {
  test('DEFAULT_SIZE is 344', () => {
    expect(DEFAULT_SIZE).toBe(344);
  });

  test('CORE_RADIUS_RATIO is 0.22', () => {
    expect(CORE_RADIUS_RATIO).toBe(0.22);
  });
});
