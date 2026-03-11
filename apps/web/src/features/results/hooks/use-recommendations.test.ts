import { describe, test, expect } from 'bun:test';

/**
 * Tests for results query key factory (recommendations keys).
 *
 * The hook itself is a thin TanStack Query wrapper — we test
 * the query key structure, not the hook.
 */

// resultKeys is in its own module with no @tanstack dependencies
import { resultKeys } from '../lib/query-keys.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('resultKeys — recommendations', () => {
  test('all key is ["results"]', () => {
    expect(resultKeys.all).toEqual(['results']);
  });

  test('recommendations key includes surveyId', () => {
    expect(resultKeys.recommendations('survey-1')).toEqual([
      'results', 'recommendations', 'survey-1',
    ]);
  });

  test('recommendations keys for different surveys are distinct', () => {
    const a = resultKeys.recommendations('s-1');
    const b = resultKeys.recommendations('s-2');
    expect(a).not.toEqual(b);
  });

  test('recommendations key starts with the all prefix', () => {
    const key = resultKeys.recommendations('s-1');
    expect(key.slice(0, resultKeys.all.length)).toEqual([...resultKeys.all]);
  });

  test('recommendations and overallScores keys are distinct', () => {
    const recs = resultKeys.recommendations('s-1');
    const scores = resultKeys.overallScores('s-1');
    expect(recs).not.toEqual(scores);
  });
});
