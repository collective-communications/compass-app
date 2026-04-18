import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useSegmentScores — verifies the safe_segment_scores query shape
 * (survey + segment filters, optional segment_value), the snake→camel row
 * transform, and the isMasked anonymity flag passthrough.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastFilters: Array<{ column: string; value: unknown }> = [];
let lastTable: string | null = null;

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
  supabase: {
    from: (table: string) => {
      lastTable = table;
      return makeChain();
    },
  },
}));

const { useSegmentScores } = await import('./use-segment-scores.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSegmentScores', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastFilters = [];
    lastTable = null;
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(
      () => useSegmentScores({ surveyId: '', segmentType: 'department' }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('is disabled when segmentType is empty', () => {
    const { result } = renderHook(
      () => useSegmentScores({ surveyId: 'survey-1', segmentType: '' }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('queries the safe_segment_scores view (anonymity-enforcing)', async () => {
    nextResult = { data: [], error: null };
    const { result } = renderHook(
      () => useSegmentScores({ surveyId: 'survey-1', segmentType: 'department' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastTable).toBe('safe_segment_scores');
  });

  test('transforms rows into camelCase and preserves isMasked', async () => {
    nextResult = {
      data: [
        {
          survey_id: 'survey-1',
          segment_type: 'department',
          segment_value: 'engineering',
          dimension_code: 'core',
          is_masked: false,
          score: 72,
          raw_score: 3.7,
          response_count: 10,
        },
        {
          survey_id: 'survey-1',
          segment_type: 'department',
          segment_value: 'tiny-team',
          dimension_code: 'core',
          is_masked: true,
          score: null,
          raw_score: null,
          response_count: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(
      () => useSegmentScores({ surveyId: 'survey-1', segmentType: 'department' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rows = result.current.data!;
    expect(rows).toHaveLength(2);
    expect(rows[0]!.segmentValue).toBe('engineering');
    expect(rows[0]!.dimensionCode).toBe('core');
    expect(rows[0]!.isMasked).toBe(false);
    expect(rows[0]!.score).toBe(72);

    // Masked row should preserve nulls — never invent values.
    expect(rows[1]!.isMasked).toBe(true);
    expect(rows[1]!.score).toBeNull();
    expect(rows[1]!.responseCount).toBeNull();
  });

  test('applies survey_id + segment_type filters when segmentValue is omitted', async () => {
    const { result } = renderHook(
      () =>
        useSegmentScores({ surveyId: 'survey-9', segmentType: 'role' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastFilters).toContainEqual({ column: 'survey_id', value: 'survey-9' });
    expect(lastFilters).toContainEqual({ column: 'segment_type', value: 'role' });
    // segment_value filter should NOT be applied.
    expect(lastFilters.find((f) => f.column === 'segment_value')).toBeUndefined();
  });

  test('adds a segment_value filter when provided', async () => {
    const { result } = renderHook(
      () =>
        useSegmentScores({
          surveyId: 'survey-9',
          segmentType: 'role',
          segmentValue: 'manager',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastFilters).toContainEqual({ column: 'segment_value', value: 'manager' });
  });

  test('surfaces error state when the query fails', async () => {
    nextResult = { data: null, error: new Error('403 Forbidden') };
    const { result } = renderHook(
      () => useSegmentScores({ surveyId: 'survey-1', segmentType: 'dept' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('403');
  });
});
