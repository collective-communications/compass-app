import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for useRecommendations query function and row transformation.
 *
 * Same pattern as use-overall-scores.test.ts: mock supabase + useQuery
 * to capture and invoke the queryFn directly.
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

let capturedQueryFn: (() => Promise<unknown>) | null = null;

mock.module('@tanstack/react-query', () => ({
  useQuery: (opts: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = opts.queryFn;
    return { data: undefined, isLoading: true, error: null };
  },
}));

const { useRecommendations } = await import('./use-recommendations.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRecommendations — queryFn / transformRows', () => {
  beforeEach(() => {
    capturedQueryFn = null;
    queryResult = { data: [], error: null };
  });

  function getQueryFn(): () => Promise<unknown> {
    useRecommendations('survey-1');
    if (!capturedQueryFn) throw new Error('queryFn not captured');
    return capturedQueryFn;
  }

  test('transforms recommendation rows with correct field mapping', async () => {
    queryResult = {
      data: [
        {
          id: 'rec-1',
          dimension_code: 'clarity',
          severity: 'high',
          title: 'Improve Clarity',
          body: 'Communication gaps detected.',
          actions: ['Run workshops', 'Publish guidelines'],
          ccc_service_link: 'https://ccc.ca/clarity',
          trust_ladder_link: null,
          priority: 1,
        },
      ],
      error: null,
    };

    const fn = getQueryFn();
    const result = await fn() as Array<Record<string, unknown>>;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rec-1');
    expect(result[0].dimensionCode).toBe('clarity');
    expect(result[0].severity).toBe('high');
    expect(result[0].title).toBe('Improve Clarity');
    expect(result[0].body).toBe('Communication gaps detected.');
    expect(result[0].actions).toEqual(['Run workshops', 'Publish guidelines']);
    expect(result[0].cccServiceLink).toBe('https://ccc.ca/clarity');
    expect(result[0].trustLadderLink).toBeNull();
    expect(result[0].priority).toBe(1);
  });

  test('converts non-array actions to empty array', async () => {
    queryResult = {
      data: [
        {
          id: 'rec-2',
          dimension_code: 'core',
          severity: 'medium',
          title: 'Strengthen Core',
          body: 'Foundation needs work.',
          actions: null,
          ccc_service_link: null,
          trust_ladder_link: null,
          priority: 2,
        },
      ],
      error: null,
    };

    const fn = getQueryFn();
    const result = await fn() as Array<Record<string, unknown>>;

    expect(result[0].actions).toEqual([]);
  });

  test('maps multiple rows preserving order', async () => {
    queryResult = {
      data: [
        { id: 'r1', dimension_code: 'core', severity: 'critical', title: 'First', body: '', actions: [], ccc_service_link: null, trust_ladder_link: null, priority: 1 },
        { id: 'r2', dimension_code: 'clarity', severity: 'high', title: 'Second', body: '', actions: [], ccc_service_link: null, trust_ladder_link: null, priority: 2 },
        { id: 'r3', dimension_code: 'connection', severity: 'medium', title: 'Third', body: '', actions: [], ccc_service_link: null, trust_ladder_link: null, priority: 3 },
      ],
      error: null,
    };

    const fn = getQueryFn();
    const result = await fn() as Array<Record<string, unknown>>;

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('First');
    expect(result[1].title).toBe('Second');
    expect(result[2].title).toBe('Third');
  });

  test('throws on supabase error', async () => {
    queryResult = { data: null, error: { message: 'permission denied' } };

    const fn = getQueryFn();
    await expect(fn()).rejects.toEqual({ message: 'permission denied' });
  });

  test('empty data returns empty array', async () => {
    queryResult = { data: [], error: null };

    const fn = getQueryFn();
    const result = await fn() as unknown[];

    expect(result).toEqual([]);
  });
});
