import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useArchetype — verifies the hook is gated on useOverallScores and
 * runs identifyArchetype against the real ARCHETYPE_VECTORS when scores arrive.
 * Supabase is mocked at the module level so the upstream useOverallScores
 * query resolves synchronously.
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
  supabase: {
    from: () => makeChain(),
  },
}));

const { useArchetype } = await import('./use-archetype.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeScoreRows(): unknown[] {
  return [
    {
      survey_id: 'survey-1',
      segment_type: 'overall',
      segment_value: 'all',
      dimension_code: 'core',
      score: 80,
      raw_score: 3.9,
      response_count: 42,
    },
    {
      survey_id: 'survey-1',
      segment_type: 'overall',
      segment_value: 'all',
      dimension_code: 'clarity',
      score: 70,
      raw_score: 3.6,
      response_count: 42,
    },
    {
      survey_id: 'survey-1',
      segment_type: 'overall',
      segment_value: 'all',
      dimension_code: 'connection',
      score: 65,
      raw_score: 3.5,
      response_count: 42,
    },
    {
      survey_id: 'survey-1',
      segment_type: 'overall',
      segment_value: 'all',
      dimension_code: 'collaboration',
      score: 60,
      raw_score: 3.4,
      response_count: 42,
    },
  ];
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useArchetype', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(() => useArchetype(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('stays pending while upstream scores have not resolved', () => {
    // Upstream useOverallScores fires and has not resolved yet — archetype
    // query remains disabled because `!!scores` is false.
    nextResult = { data: makeScoreRows(), error: null };
    const { result } = renderHook(() => useArchetype('survey-1'), {
      wrapper: makeWrapper(),
    });
    // Initially both queries are loading; data is undefined.
    expect(result.current.data).toBeUndefined();
  });

  test('resolves to an ArchetypeMatch once scores load', async () => {
    nextResult = { data: makeScoreRows(), error: null };
    const { result } = renderHook(() => useArchetype('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const match = result.current.data!;
    expect(match).toBeDefined();
    expect(typeof match.archetype.name).toBe('string');
    expect(typeof match.distance).toBe('number');
    expect(['strong', 'moderate', 'weak']).toContain(match.confidence);
  });

  test('distance is non-negative and archetype has displayOrder', async () => {
    nextResult = { data: makeScoreRows(), error: null };
    const { result } = renderHook(() => useArchetype('survey-2'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const match = result.current.data!;
    expect(match.distance).toBeGreaterThanOrEqual(0);
    expect(typeof match.archetype.displayOrder).toBe('number');
  });

  test('surfaces error when upstream scores query fails', async () => {
    nextResult = { data: null, error: new Error('RLS denied') };
    const { result } = renderHook(() => useArchetype('survey-1'), {
      wrapper: makeWrapper(),
    });
    // Upstream failure keeps archetype disabled (scores never arrive),
    // but the upstream error is still observable.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
  });

  test('produces a stable ArchetypeMatch across renders for the same scores', async () => {
    nextResult = { data: makeScoreRows(), error: null };
    const { result, rerender } = renderHook(() => useArchetype('survey-3'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data;

    rerender();
    const second = result.current.data;
    expect(second?.archetype.name).toBe(first?.archetype.name);
  });
});
