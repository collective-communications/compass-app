import { describe, expect, test } from 'bun:test';
import { buildLikertScale, buildLikertLabels, isValidLikertValue } from './survey.js';

describe('buildLikertScale', () => {
  test('buildLikertScale(5) returns 5 options with correct labels', () => {
    const scale = buildLikertScale(5);

    expect(scale).toHaveLength(5);
    expect(scale[0]).toEqual({ value: 1, label: 'Strongly Disagree' });
    expect(scale[1]).toEqual({ value: 2, label: 'Disagree' });
    expect(scale[2]).toEqual({ value: 3, label: 'Neither Agree nor Disagree' });
    expect(scale[3]).toEqual({ value: 4, label: 'Agree' });
    expect(scale[4]).toEqual({ value: 5, label: 'Strongly Agree' });
  });

  test('buildLikertScale(2) returns 2 options', () => {
    const scale = buildLikertScale(2);

    expect(scale).toHaveLength(2);
    expect(scale[0]).toEqual({ value: 1, label: 'Disagree' });
    expect(scale[1]).toEqual({ value: 2, label: 'Agree' });
  });

  test('buildLikertScale(3) returns 3 options', () => {
    const scale = buildLikertScale(3);

    expect(scale).toHaveLength(3);
    expect(scale[0]!.label).toBe('Disagree');
    expect(scale[1]!.label).toBe('Neutral');
    expect(scale[2]!.label).toBe('Agree');
  });

  test('buildLikertScale(4) returns 4 options', () => {
    const scale = buildLikertScale(4);

    expect(scale).toHaveLength(4);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[3]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(6) returns 6 options', () => {
    const scale = buildLikertScale(6);

    expect(scale).toHaveLength(6);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[5]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(7) returns 7 options with midpoint', () => {
    const scale = buildLikertScale(7);

    expect(scale).toHaveLength(7);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[3]!.label).toBe('Neither Agree nor Disagree');
    expect(scale[6]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(8) returns 8 interpolated options', () => {
    const scale = buildLikertScale(8);

    expect(scale).toHaveLength(8);
    expect(scale[0]!.value).toBe(1);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[7]!.value).toBe(8);
    expect(scale[7]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(9) returns 9 interpolated options with midpoint', () => {
    const scale = buildLikertScale(9);

    expect(scale).toHaveLength(9);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[4]!.label).toBe('Neither Agree nor Disagree');
    expect(scale[8]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(10) returns 10 interpolated options', () => {
    const scale = buildLikertScale(10);

    expect(scale).toHaveLength(10);
    expect(scale[0]!.label).toBe('Strongly Disagree');
    expect(scale[9]!.label).toBe('Strongly Agree');
  });

  test('buildLikertScale(1) throws RangeError', () => {
    expect(() => buildLikertScale(1)).toThrow(RangeError);
  });

  test('buildLikertScale(11) throws RangeError', () => {
    expect(() => buildLikertScale(11)).toThrow(RangeError);
  });

  test('buildLikertScale(0) throws RangeError', () => {
    expect(() => buildLikertScale(0)).toThrow(RangeError);
  });

  test('buildLikertScale(-1) throws RangeError', () => {
    expect(() => buildLikertScale(-1)).toThrow(RangeError);
  });

  test('buildLikertScale with non-integer throws RangeError', () => {
    expect(() => buildLikertScale(3.5)).toThrow(RangeError);
  });

  test('values are sequential 1..size for all valid sizes', () => {
    for (let size = 2; size <= 10; size++) {
      const scale = buildLikertScale(size);
      const values = scale.map((item) => item.value);
      const expected = Array.from({ length: size }, (_, i) => i + 1);
      expect(values).toEqual(expected);
    }
  });
});

describe('buildLikertLabels', () => {
  test('returns a record mapping values to labels for a 5-point scale', () => {
    const labels = buildLikertLabels(5);

    expect(labels[1]).toBe('Strongly Disagree');
    expect(labels[2]).toBe('Disagree');
    expect(labels[3]).toBe('Neither Agree nor Disagree');
    expect(labels[4]).toBe('Agree');
    expect(labels[5]).toBe('Strongly Agree');
    expect(Object.keys(labels)).toHaveLength(5);
  });

  test('throws RangeError for invalid size', () => {
    expect(() => buildLikertLabels(1)).toThrow(RangeError);
    expect(() => buildLikertLabels(11)).toThrow(RangeError);
  });
});

describe('isValidLikertValue', () => {
  test('returns true for values within [1, scaleSize]', () => {
    expect(isValidLikertValue(1, 5)).toBe(true);
    expect(isValidLikertValue(3, 5)).toBe(true);
    expect(isValidLikertValue(5, 5)).toBe(true);
  });

  test('returns false for value below 1', () => {
    expect(isValidLikertValue(0, 5)).toBe(false);
    expect(isValidLikertValue(-1, 5)).toBe(false);
  });

  test('returns false for value above scaleSize', () => {
    expect(isValidLikertValue(6, 5)).toBe(false);
    expect(isValidLikertValue(11, 10)).toBe(false);
  });

  test('returns false for non-integer values', () => {
    expect(isValidLikertValue(2.5, 5)).toBe(false);
    expect(isValidLikertValue(1.1, 4)).toBe(false);
  });

  test('boundary check: value 1 is always valid for any scale', () => {
    for (let size = 2; size <= 10; size++) {
      expect(isValidLikertValue(1, size)).toBe(true);
    }
  });

  test('boundary check: value equal to scaleSize is valid', () => {
    for (let size = 2; size <= 10; size++) {
      expect(isValidLikertValue(size, size)).toBe(true);
    }
  });

  test('boundary check: value one above scaleSize is invalid', () => {
    for (let size = 2; size <= 10; size++) {
      expect(isValidLikertValue(size + 1, size)).toBe(false);
    }
  });
});
