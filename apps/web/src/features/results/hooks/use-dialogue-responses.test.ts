import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useDialogueResponses — verifies the pagination cap (Wave 3.A),
 * `hasMore` + `cap` surface, snake→camel row transform, and the optional
 * question_id filter.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastFilters: Array<{ column: string; value: unknown }> = [];
let lastLimit: number | null = null;
let lastOrder: { column: string; options: unknown } | null = null;
let lastTable: string | null = null;

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = (column: unknown, value: unknown) => {
    lastFilters.push({ column: column as string, value });
    return chain;
  };
  chain.order = (column: unknown, options: unknown) => {
    lastOrder = { column: column as string, options };
    return chain;
  };
  chain.limit = (n: unknown) => {
    lastLimit = n as number;
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
    from: (table: string) => {
      lastTable = table;
      return makeChain();
    },
  },
}));

const { useDialogueResponses, DIALOGUE_RESPONSES_CAP } = await import(
  './use-dialogue-responses.js'
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeRows(n: number): unknown[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `row-${i}`,
    question_id: `q-${(i % 3) + 1}`,
    question_text: `Question ${(i % 3) + 1}`,
    response_text: `Response ${i}`,
    created_at: new Date(2026, 0, (i % 28) + 1).toISOString(),
  }));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useDialogueResponses', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastFilters = [];
    lastLimit = null;
    lastOrder = null;
    lastTable = null;
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: '' }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    // cap + hasMore are always present even when disabled.
    expect(result.current.cap).toBe(DIALOGUE_RESPONSES_CAP);
    expect(result.current.hasMore).toBe(false);
  });

  test('queries dialogue_responses with limit = cap + 1 and order by created_at DESC', async () => {
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastTable).toBe('dialogue_responses');
    expect(lastLimit).toBe(DIALOGUE_RESPONSES_CAP + 1);
    expect(lastOrder).toEqual({
      column: 'created_at',
      options: { ascending: false },
    });
  });

  test('transforms rows to camelCase DialogueResponse objects', async () => {
    nextResult = {
      data: [
        {
          id: 'r1',
          question_id: 'q-42',
          question_text: 'What went well?',
          response_text: 'Great collaboration this quarter',
          created_at: '2026-03-01T12:00:00Z',
        },
      ],
      error: null,
    };
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rows = result.current.data!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 'r1',
      questionId: 'q-42',
      questionText: 'What went well?',
      responseText: 'Great collaboration this quarter',
      createdAt: '2026-03-01T12:00:00Z',
    });
  });

  test('exposes hasMore = false when row count is at or below cap', async () => {
    nextResult = { data: makeRows(DIALOGUE_RESPONSES_CAP), error: null };
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasMore).toBe(false);
    expect(result.current.data!.length).toBe(DIALOGUE_RESPONSES_CAP);
  });

  test('exposes hasMore = true and trims to cap when overflow row is present', async () => {
    nextResult = { data: makeRows(DIALOGUE_RESPONSES_CAP + 1), error: null };
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasMore).toBe(true);
    // Trimmed down to the cap — the extra detection row is dropped from data.
    expect(result.current.data!.length).toBe(DIALOGUE_RESPONSES_CAP);
    expect(result.current.cap).toBe(DIALOGUE_RESPONSES_CAP);
  });

  test('adds question_id filter when questionId is provided', async () => {
    const { result } = renderHook(
      () =>
        useDialogueResponses({ surveyId: 'survey-9', questionId: 'q-7' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastFilters).toContainEqual({ column: 'survey_id', value: 'survey-9' });
    expect(lastFilters).toContainEqual({ column: 'question_id', value: 'q-7' });
  });

  test('surfaces error state when the query fails', async () => {
    nextResult = { data: null, error: new Error('403 RLS denied') };
    const { result } = renderHook(
      () => useDialogueResponses({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('RLS denied');
    expect(result.current.hasMore).toBe(false);
  });
});
