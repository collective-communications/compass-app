import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useQuestionScores — verifies the question_scores query shape,
 * the row→QuestionScoreRow transform (including dynamic Likert distribution
 * sizing), and the optional dimension filter.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastFilters: Array<{ column: string; value: unknown }> = [];
let lastSelect: string | null = null;
let lastOrder: { column: string; options: unknown } | null = null;
let lastTable: string | null = null;

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};

  chain.select = (cols: unknown) => {
    lastSelect = cols as string;
    return chain;
  };
  chain.eq = (column: unknown, value: unknown) => {
    lastFilters.push({ column: column as string, value });
    return chain;
  };
  chain.order = (column: unknown, options: unknown) => {
    lastOrder = { column: column as string, options };
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

const { useQuestionScores } = await import('./use-question-scores.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    question_id: 'q-1',
    question_text: 'How engaged do you feel?',
    dimension_code: 'core',
    mean_score: 3.8,
    response_count: 42,
    is_reverse_scored: false,
    sub_dimension_code: null,
    sub_dimension_name: null,
    dist_1: 0,
    dist_2: 0,
    dist_3: 0,
    dist_4: 0,
    dist_5: 0,
    dist_6: 0,
    dist_7: 0,
    dist_8: 0,
    dist_9: 0,
    dist_10: 0,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useQuestionScores', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastFilters = [];
    lastSelect = null;
    lastOrder = null;
    lastTable = null;
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(
      () => useQuestionScores({ surveyId: '' }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('queries the question_scores view and orders by mean_score ascending', async () => {
    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastTable).toBe('question_scores');
    expect(lastOrder).toEqual({ column: 'mean_score', options: { ascending: true } });
    expect(lastSelect).toContain('sub_dimension_code');
    expect(lastSelect).toContain('dist_10');
  });

  test('transforms rows and keeps 5-point distribution keys when dist_5 > 0', async () => {
    nextResult = {
      data: [
        makeRow({
          question_id: 'q-engage',
          mean_score: 3.5,
          dist_1: 1,
          dist_2: 2,
          dist_3: 5,
          dist_4: 10,
          dist_5: 3,
        }),
      ],
      error: null,
    };

    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rows = result.current.data!;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.questionId).toBe('q-engage');
    expect(rows[0]!.dimensionCode).toBe('core');
    expect(rows[0]!.distribution).toEqual({ 1: 1, 2: 2, 3: 5, 4: 10, 5: 3 });
  });

  test('caps distribution at the highest non-zero bin (4-point scale case)', async () => {
    nextResult = {
      data: [
        makeRow({
          dist_1: 0,
          dist_2: 1,
          dist_3: 4,
          dist_4: 7,
          dist_5: 0,
        }),
      ],
      error: null,
    };

    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const dist = result.current.data![0]!.distribution;
    // Highest non-zero bin is dist_4 → keys 1..4, no key 5.
    expect(Object.keys(dist)).toEqual(['1', '2', '3', '4']);
    expect(dist[5]).toBeUndefined();
  });

  test('passes through sub-dimension metadata when present', async () => {
    nextResult = {
      data: [
        makeRow({
          sub_dimension_code: 'trust',
          sub_dimension_name: 'Trust',
          dist_5: 1,
        }),
      ],
      error: null,
    };

    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0]!.subDimensionCode).toBe('trust');
    expect(result.current.data![0]!.subDimensionName).toBe('Trust');
  });

  test('adds a dimension_code filter when provided', async () => {
    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1', dimensionCode: 'clarity' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastFilters).toContainEqual({ column: 'survey_id', value: 'survey-1' });
    expect(lastFilters).toContainEqual({ column: 'dimension_code', value: 'clarity' });
  });

  test('omits the dimension filter when dimensionCode is undefined', async () => {
    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastFilters.find((f) => f.column === 'dimension_code')).toBeUndefined();
  });

  test('surfaces error state when the query fails', async () => {
    nextResult = { data: null, error: new Error('500 Server') };
    const { result } = renderHook(
      () => useQuestionScores({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('500');
  });
});
