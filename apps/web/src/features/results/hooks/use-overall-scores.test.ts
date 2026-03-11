import { describe, test, expect } from 'bun:test';

/**
 * Tests for results query key factory (overall scores keys).
 *
 * The hook itself is a thin TanStack Query wrapper — we test
 * the query key structure, not the hook.
 */

// resultKeys is in its own module with no @tanstack dependencies
import { resultKeys } from '../lib/query-keys.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('resultKeys — overallScores', () => {
  test('all key is ["results"]', () => {
    expect(resultKeys.all).toEqual(['results']);
  });

  test('overallScores key includes surveyId', () => {
    expect(resultKeys.overallScores('survey-1')).toEqual([
      'results', 'overallScores', 'survey-1',
    ]);
  });

  test('overallScores keys for different surveys are distinct', () => {
    const a = resultKeys.overallScores('s-1');
    const b = resultKeys.overallScores('s-2');
    expect(a).not.toEqual(b);
  });

  test('overallScores key starts with the all prefix', () => {
    const key = resultKeys.overallScores('s-1');
    expect(key.slice(0, resultKeys.all.length)).toEqual([...resultKeys.all]);
  });

  test('overallScores and segmentScores keys are distinct', () => {
    const overall = resultKeys.overallScores('s-1');
    const segment = resultKeys.segmentScores('s-1', 'department');
    expect(overall).not.toEqual(segment);
  });
});
