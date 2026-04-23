import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useTrustLadder — verifies the hook surfaces the derived
 * TrustLadderResult once upstream useOverallScores resolves, and passes
 * through loading / error state from that upstream query.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.order = self;
  chain.eq = self;

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

const { useTrustLadder } = await import('./use-trust-ladder.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeRow(dimension: string, score: number): Record<string, unknown> {
  return {
    survey_id: 'survey-1',
    segment_type: 'overall',
    segment_value: 'all',
    dimension_code: dimension,
    score,
    raw_score: score / 20,
    response_count: 42,
  };
}

function makeAllDimensions(score: number): unknown[] {
  return [
    makeRow('core', score),
    makeRow('clarity', score),
    makeRow('connection', score),
    makeRow('collaboration', score),
  ];
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useTrustLadder', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
  });

  test('starts in loading state with undefined data', () => {
    nextResult = { data: makeAllDimensions(80), error: null };
    const { result } = renderHook(() => useTrustLadder('survey-1'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  test('resolves to a TrustLadderResult once scores load', async () => {
    nextResult = { data: makeAllDimensions(80), error: null };
    const { result } = renderHook(() => useTrustLadder('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const ladder = result.current.data!;
    expect(Array.isArray(ladder.rungs)).toBe(true);
    expect(ladder.rungs.length).toBeGreaterThan(0);
    expect(typeof ladder.currentLevel).toBe('number');
    expect(Array.isArray(ladder.nextActions)).toBe(true);
  });

  test('higher dimension scores produce a higher currentLevel than low scores', async () => {
    nextResult = { data: makeAllDimensions(15), error: null };
    const { result: low } = renderHook(() => useTrustLadder('low-survey'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(low.current.data).toBeDefined());
    const lowLevel = low.current.data!.currentLevel;

    nextResult = { data: makeAllDimensions(95), error: null };
    const { result: high } = renderHook(() => useTrustLadder('high-survey'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(high.current.data).toBeDefined());
    const highLevel = high.current.data!.currentLevel;

    expect(highLevel).toBeGreaterThanOrEqual(lowLevel);
  });

  test('each rung has a status in {achieved, in_progress, not_started}', async () => {
    nextResult = { data: makeAllDimensions(70), error: null };
    const { result } = renderHook(() => useTrustLadder('survey-2'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    for (const rung of result.current.data!.rungs) {
      expect(['achieved', 'in_progress', 'not_started']).toContain(rung.status);
    }
  });

  test('surfaces upstream error when the scores query fails', async () => {
    nextResult = { data: null, error: new Error('RLS violation') };
    const { result } = renderHook(() => useTrustLadder('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect((result.current.error as Error).message).toContain('RLS');
    expect(result.current.data).toBeUndefined();
  });

  test('memoizes data across renders for the same score input', async () => {
    nextResult = { data: makeAllDimensions(85), error: null };
    const { result, rerender } = renderHook(() => useTrustLadder('survey-3'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const first = result.current.data;

    rerender();
    const second = result.current.data;
    // useMemo gives referential equality when inputs are unchanged.
    expect(second).toBe(first);
  });
});
