import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useSurveyHistory — verifies the `surveys` query (organization +
 * status filter, closes_at ordering) and row transform that narrows status
 * to the union `'closed' | 'archived'`.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastEqFilters: Array<{ column: string; value: unknown }> = [];
let lastInFilter: { column: string; values: unknown[] } | null = null;
let lastOrder: { column: string; options: unknown } | null = null;
let lastTable: string | null = null;

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = (column: unknown, value: unknown) => {
    lastEqFilters.push({ column: column as string, value });
    return chain;
  };
  chain.in = (column: unknown, values: unknown) => {
    lastInFilter = { column: column as string, values: values as unknown[] };
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
  surveySessionClient: () => ({ from: () => ({}) }),
  supabase: {
    from: (table: string) => {
      lastTable = table;
      return makeChain();
    },
  },
}));

const { useSurveyHistory } = await import('./use-survey-history.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSurveyHistory', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastEqFilters = [];
    lastInFilter = null;
    lastOrder = null;
    lastTable = null;
  });

  test('is disabled when organizationId is empty', () => {
    const { result } = renderHook(() => useSurveyHistory(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('filters to closed/archived statuses and orders by closes_at DESC', async () => {
    const { result } = renderHook(() => useSurveyHistory('org-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastTable).toBe('surveys');
    expect(lastEqFilters).toContainEqual({ column: 'organization_id', value: 'org-1' });
    expect(lastInFilter).toEqual({ column: 'status', values: ['closed', 'archived'] });
    expect(lastOrder).toEqual({
      column: 'closes_at',
      options: { ascending: false },
    });
  });

  test('transforms rows and preserves status narrowing', async () => {
    nextResult = {
      data: [
        {
          id: 's-1',
          title: 'Q1 2026 Pulse',
          status: 'closed',
          closes_at: '2026-02-15T00:00:00Z',
        },
        {
          id: 's-2',
          title: 'Q4 2025 Pulse',
          status: 'archived',
          closes_at: '2025-12-15T00:00:00Z',
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useSurveyHistory('org-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rows = result.current.data!;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: 's-1',
      title: 'Q1 2026 Pulse',
      status: 'closed',
      closesAt: '2026-02-15T00:00:00Z',
    });
    expect(rows[1]!.status).toBe('archived');
    expect(rows[1]!.closesAt).toBe('2025-12-15T00:00:00Z');
  });

  test('returns an empty array when the org has no historical surveys', async () => {
    nextResult = { data: [], error: null };
    const { result } = renderHook(() => useSurveyHistory('org-empty'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  test('surfaces error state when the query fails', async () => {
    nextResult = { data: null, error: new Error('400 Bad Request') };
    const { result } = renderHook(() => useSurveyHistory('org-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('400');
  });
});
