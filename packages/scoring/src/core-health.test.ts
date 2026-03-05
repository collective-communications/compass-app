import { describe, expect, test } from 'bun:test';
import { classifyCoreHealth } from './core-health.js';

describe('classifyCoreHealth', () => {
  test('above 70 is healthy', () => {
    expect(classifyCoreHealth(71)).toBe('healthy');
    expect(classifyCoreHealth(100)).toBe('healthy');
    expect(classifyCoreHealth(90)).toBe('healthy');
  });

  test('exactly 70 is fragile (not healthy)', () => {
    expect(classifyCoreHealth(70)).toBe('fragile');
  });

  test('between 50 and 70 is fragile', () => {
    expect(classifyCoreHealth(60)).toBe('fragile');
    expect(classifyCoreHealth(55)).toBe('fragile');
  });

  test('exactly 50 is fragile', () => {
    expect(classifyCoreHealth(50)).toBe('fragile');
  });

  test('below 50 is broken', () => {
    expect(classifyCoreHealth(49)).toBe('broken');
    expect(classifyCoreHealth(0)).toBe('broken');
    expect(classifyCoreHealth(25)).toBe('broken');
  });

  test('boundary at 70.01 is healthy', () => {
    expect(classifyCoreHealth(70.01)).toBe('healthy');
  });

  test('boundary at 49.99 is broken', () => {
    expect(classifyCoreHealth(49.99)).toBe('broken');
  });
});
