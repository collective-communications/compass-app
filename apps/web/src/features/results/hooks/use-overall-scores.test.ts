import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for useOverallScores query function logic.
 *
 * Since the hook wraps TanStack Query, we test the fetcher indirectly:
 * mock supabase, import the module, and invoke the hook's queryFn
 * by extracting it from the useQuery call.
 *
 * We mock both supabase and @tanstack/react-query to capture the queryFn.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string };
}

let queryResult: MockResult = { data: [], error: null };

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = self;
  chain.order = self;

  // Make thenable so await resolves to query result
  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(queryResult).then(onFulfilled, onRejected);

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: (_table: string) => makeChain(),
  },
}));

// Capture the queryFn passed to useQuery
let capturedQueryFn: (() => Promise<unknown>) | null = null;

mock.module('@tanstack/react-query', () => ({
  useQuery: (opts: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = opts.queryFn;
    return { data: undefined, isLoading: true, error: null };
  },
}));

await import('./use-overall-scores.js');

// We need to call the hook once to capture queryFn
const { useOverallScores } = await import('./use-overall-scores.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useOverallScores — queryFn / transformToScoreMap', () => {
  beforeEach(() => {
    capturedQueryFn = null;
    queryResult = { data: [], error: null };
  });

  function getQueryFn(): () => Promise<unknown> {
    // Call hook to capture queryFn
    useOverallScores('survey-1');
    if (!capturedQueryFn) throw new Error('queryFn not captured');
    return capturedQueryFn;
  }

  test('transforms rows into DimensionScoreMap keyed by dimension_code', async () => {
    queryResult = {
      data: [
        { survey_id: 's1', segment_type: 'overall', segment_value: 'all', dimension_code: 'core', score: 75, raw_score: 3.0, response_count: 42 },
        { survey_id: 's1', segment_type: 'overall', segment_value: 'all', dimension_code: 'clarity', score: 60, raw_score: 2.4, response_count: 42 },
        { survey_id: 's1', segment_type: 'overall', segment_value: 'all', dimension_code: 'connection', score: 85, raw_score: 3.4, response_count: 42 },
        { survey_id: 's1', segment_type: 'overall', segment_value: 'all', dimension_code: 'collaboration', score: 70, raw_score: 2.8, response_count: 42 },
      ],
      error: null,
    };

    const fn = getQueryFn();
    const result = await fn() as Record<string, unknown>;

    expect(result).toHaveProperty('core');
    expect(result).toHaveProperty('clarity');
    expect(result).toHaveProperty('connection');
    expect(result).toHaveProperty('collaboration');
  });

  test('each dimension entry has correct shape', async () => {
    queryResult = {
      data: [
        { survey_id: 's1', segment_type: 'overall', segment_value: 'all', dimension_code: 'core', score: 75, raw_score: 3.0, response_count: 42 },
      ],
      error: null,
    };

    const fn = getQueryFn();
    const result = await fn() as Record<string, { dimensionId: string; dimensionCode: string; score: number; rawScore: number; responseCount: number }>;

    expect(result['core'].dimensionId).toBe('core');
    expect(result['core'].dimensionCode).toBe('core');
    expect(result['core'].score).toBe(75);
    expect(result['core'].rawScore).toBe(3.0);
    expect(result['core'].responseCount).toBe(42);
  });

  test('throws on supabase error', async () => {
    queryResult = { data: null, error: { message: 'relation not found' } };

    const fn = getQueryFn();
    await expect(fn()).rejects.toEqual({ message: 'relation not found' });
  });

  test('empty rows produce empty map', async () => {
    queryResult = { data: [], error: null };

    const fn = getQueryFn();
    const result = await fn() as Record<string, unknown>;

    expect(Object.keys(result)).toHaveLength(0);
  });
});
