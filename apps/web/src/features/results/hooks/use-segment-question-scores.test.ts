import { describe, expect, test } from 'bun:test';

/**
 * Tests for results query key factory (segment question scores keys).
 *
 * The hook itself is a thin TanStack Query wrapper — we test
 * the query key structure, not the hook.
 */

import { resultKeys } from '../lib/query-keys.js';

// --- Tests -------------------------------------------------------------------

describe('resultKeys — segmentQuestionScores', () => {
  test('key includes surveyId, segmentType, and segmentValue', () => {
    expect(resultKeys.segmentQuestionScores('s1', 'department', 'Engineering')).toEqual([
      'results', 'segmentQuestionScores', 's1', 'department', 'Engineering',
    ]);
  });

  test('keys for different segments are distinct', () => {
    const a = resultKeys.segmentQuestionScores('s1', 'department', 'Engineering');
    const b = resultKeys.segmentQuestionScores('s1', 'department', 'Marketing');
    expect(a).not.toEqual(b);
  });

  test('keys for different segment types are distinct', () => {
    const a = resultKeys.segmentQuestionScores('s1', 'department', 'Engineering');
    const b = resultKeys.segmentQuestionScores('s1', 'role', 'Engineering');
    expect(a).not.toEqual(b);
  });

  test('key is distinct from questionScores key', () => {
    const segment = resultKeys.segmentQuestionScores('s1', 'department', 'Eng');
    const question = resultKeys.questionScores('s1');
    expect(segment).not.toEqual(question);
  });
});
