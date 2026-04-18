import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useTrendComparison — verifies the three-stage query (current
 * survey → prior survey → both score sets) and delta computation against
 * the prior survey. A tiny scripted mock resolves each .from(table) call to
 * a distinct queued result based on call order, which is enough for this
 * hook's deterministic flow.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let queuedResults: MockResult[] = [];
let callLog: Array<{ table: string }> = [];
const defaultResult: MockResult = { data: [], error: null };

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.lt = self;
  chain.order = self;
  chain.limit = self;

  const getResult = (): MockResult => queuedResults.shift() ?? defaultResult;

  chain.single = () => Promise.resolve(getResult());

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(getResult()).then(onFulfilled, onRejected);

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      callLog.push({ table });
      return makeChain();
    },
  },
}));

const { useTrendComparison } = await import('./use-trend-comparison.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useTrendComparison', () => {
  beforeEach(() => {
    queuedResults = [];
    callLog = [];
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(() => useTrendComparison(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('returns null overall + empty dimensions when no prior survey exists', async () => {
    queuedResults = [
      // 1. current survey .single()
      {
        data: {
          id: 'survey-current',
          organization_id: 'org-1',
          closes_at: '2026-03-01T00:00:00Z',
        },
        error: null,
      },
      // 2. prior surveys lookup (empty)
      { data: [], error: null },
    ];

    const { result } = renderHook(
      () => useTrendComparison('survey-current'),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ overall: null, dimensions: {} });
  });

  test('computes per-dimension and overall deltas against the prior survey', async () => {
    queuedResults = [
      // 1. current survey metadata
      {
        data: {
          id: 'survey-current',
          organization_id: 'org-1',
          closes_at: '2026-03-01T00:00:00Z',
        },
        error: null,
      },
      // 2. prior surveys lookup
      { data: [{ id: 'survey-prior' }], error: null },
      // 3. current scores
      {
        data: [
          { survey_id: 'survey-current', dimension_code: 'core', score: 80 },
          { survey_id: 'survey-current', dimension_code: 'clarity', score: 65 },
        ],
        error: null,
      },
      // 4. prior scores
      {
        data: [
          { survey_id: 'survey-prior', dimension_code: 'core', score: 70 },
          { survey_id: 'survey-prior', dimension_code: 'clarity', score: 60 },
        ],
        error: null,
      },
    ];

    const { result } = renderHook(
      () => useTrendComparison('survey-current'),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.dimensions.core).toBe(10); // 80 - 70
    expect(data.dimensions.clarity).toBe(5); // 65 - 60
    // overall = ((80+65) - (70+60)) / 2 = 15 / 2 = 7.5
    expect(data.overall).toBe(7.5);
  });

  test('marks dimensions with no prior match as null delta', async () => {
    queuedResults = [
      {
        data: {
          id: 'survey-current',
          organization_id: 'org-1',
          closes_at: '2026-03-01T00:00:00Z',
        },
        error: null,
      },
      { data: [{ id: 'survey-prior' }], error: null },
      {
        data: [
          { survey_id: 'survey-current', dimension_code: 'core', score: 80 },
          { survey_id: 'survey-current', dimension_code: 'connection', score: 60 },
        ],
        error: null,
      },
      {
        data: [
          { survey_id: 'survey-prior', dimension_code: 'core', score: 70 },
          // no connection row — should produce null delta
        ],
        error: null,
      },
    ];

    const { result } = renderHook(
      () => useTrendComparison('survey-current'),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.dimensions.core).toBe(10);
    expect(data.dimensions.connection).toBeNull();
  });

  test('surfaces error when the current-survey lookup fails', async () => {
    queuedResults = [
      { data: null, error: new Error('Survey not found') },
    ];

    const { result } = renderHook(
      () => useTrendComparison('survey-missing'),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('not found');
  });

  test('rounds deltas to one decimal place', async () => {
    queuedResults = [
      {
        data: {
          id: 'survey-current',
          organization_id: 'org-1',
          closes_at: '2026-03-01T00:00:00Z',
        },
        error: null,
      },
      { data: [{ id: 'survey-prior' }], error: null },
      {
        data: [
          { survey_id: 'survey-current', dimension_code: 'core', score: 70.37 },
        ],
        error: null,
      },
      {
        data: [
          { survey_id: 'survey-prior', dimension_code: 'core', score: 70.0 },
        ],
        error: null,
      },
    ];

    const { result } = renderHook(
      () => useTrendComparison('survey-current'),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 0.37 rounded to one decimal = 0.4
    expect(result.current.data!.dimensions.core).toBe(0.4);
  });
});
