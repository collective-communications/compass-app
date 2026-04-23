import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useRiskFlags — verifies the hook is gated on useOverallScores and
 * runs evaluateRiskFlags against the real thresholds. Supabase is mocked at
 * the module level so the upstream scores query resolves deterministically.
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

const { useRiskFlags } = await import('./use-risk-flags.js');

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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRiskFlags', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(() => useRiskFlags(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('returns an empty array when all dimensions are healthy', async () => {
    // All scores comfortably above the critical/high thresholds
    nextResult = {
      data: [
        makeRow('core', 85),
        makeRow('clarity', 82),
        makeRow('connection', 80),
        makeRow('collaboration', 78),
      ],
      error: null,
    };
    const { result } = renderHook(() => useRiskFlags('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  test('surfaces a critical flag when core drops below 50', async () => {
    nextResult = {
      data: [
        makeRow('core', 35),
        makeRow('clarity', 80),
        makeRow('connection', 80),
        makeRow('collaboration', 80),
      ],
      error: null,
    };
    const { result } = renderHook(() => useRiskFlags('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const flags = result.current.data!;
    expect(flags.length).toBeGreaterThan(0);
    // Critical severity for the core dimension should be present and sort first.
    expect(flags[0]!.severity).toBe('critical');
    expect(flags[0]!.dimensionCode).toBe('core');
  });

  test('sorts flags with critical before high', async () => {
    nextResult = {
      data: [
        makeRow('core', 35), // critical
        makeRow('clarity', 30), // high (dimension < 40)
        makeRow('connection', 80),
        makeRow('collaboration', 80),
      ],
      error: null,
    };
    const { result } = renderHook(() => useRiskFlags('survey-2'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const severities = result.current.data!.map((f) => f.severity);
    // critical ordinal (0) must appear at or before any high/medium ordinals.
    const criticalIdx = severities.indexOf('critical');
    const highIdx = severities.indexOf('high');
    expect(criticalIdx).toBeGreaterThanOrEqual(0);
    if (highIdx >= 0) {
      expect(criticalIdx).toBeLessThan(highIdx);
    }
  });

  test('stays idle when upstream scores query errors out', async () => {
    nextResult = { data: null, error: new Error('401 Unauthorized') };
    const { result } = renderHook(() => useRiskFlags('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    // Scores never arrive, so the derived query never enables.
    expect(result.current.data).toBeUndefined();
  });
});
