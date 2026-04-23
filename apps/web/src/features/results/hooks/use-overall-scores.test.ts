import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useOverallScores — verifies real hook behaviour (loading → data →
 * transformation), not just query-key shape. Supabase is mocked at the module
 * level using a chainable thenable builder, same pattern as
 * report-assembler.test.ts.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastFilters: Array<{ column: string; value: unknown }> = [];

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.order = self;
  chain.eq = (column: unknown, value: unknown) => {
    lastFilters.push({ column: column as string, value });
    return chain;
  };

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(nextResult).then(onFulfilled, onRejected);

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  surveySessionClient: () => ({ from: () => ({}) }),
  supabase: {
    from: () => makeChain(),
  },
}));

const { useOverallScores } = await import('./use-overall-scores.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useOverallScores', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastFilters = [];
  });

  test('starts in loading state when surveyId is valid', () => {
    nextResult = { data: [], error: null };
    const { result } = renderHook(() => useOverallScores('survey-1'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  test('is disabled (idle) when surveyId is empty', () => {
    const { result } = renderHook(() => useOverallScores(''), {
      wrapper: makeWrapper(),
    });
    // Disabled queries are not fetching and have no data.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('resolves to a DimensionScoreMap keyed by dimension code', async () => {
    nextResult = {
      data: [
        {
          survey_id: 'survey-1',
          segment_type: 'overall',
          segment_value: 'all',
          dimension_code: 'core',
          score: 72.5,
          raw_score: 3.9,
          response_count: 42,
        },
        {
          survey_id: 'survey-1',
          segment_type: 'overall',
          segment_value: 'all',
          dimension_code: 'clarity',
          score: 61.2,
          raw_score: 3.45,
          response_count: 42,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useOverallScores('survey-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map.core).toBeDefined();
    expect(map.core!.score).toBe(72.5);
    expect(map.core!.rawScore).toBe(3.9);
    expect(map.core!.responseCount).toBe(42);
    expect(map.core!.dimensionCode).toBe('core');
    expect(map.clarity!.score).toBe(61.2);
  });

  test('filters query to segment_type = "overall"', async () => {
    nextResult = { data: [], error: null };
    const { result } = renderHook(() => useOverallScores('survey-9'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Both survey_id and segment_type filters are applied.
    expect(lastFilters).toContainEqual({ column: 'survey_id', value: 'survey-9' });
    expect(lastFilters).toContainEqual({ column: 'segment_type', value: 'overall' });
  });

  test('surfaces error state when the query throws', async () => {
    nextResult = { data: null, error: new Error('RLS violation: 401') };
    const { result } = renderHook(() => useOverallScores('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('RLS violation');
  });

  test('returns an empty map when no rows are returned', async () => {
    nextResult = { data: [], error: null };
    const { result } = renderHook(() => useOverallScores('survey-empty'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.keys(result.current.data!)).toHaveLength(0);
  });
});
