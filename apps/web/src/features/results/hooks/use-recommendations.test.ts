import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useRecommendations — verifies real hook behaviour including the
 * `dimension_id` → `dimension.code` JOIN flatten (Wave 2.D fix). The
 * Supabase client is mocked at the module level with a chainable thenable.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastSelect: string | null = null;
let lastOrder: { column: string; options: unknown } | null = null;

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = (cols: unknown) => {
    lastSelect = cols as string;
    return chain;
  };
  chain.eq = self;
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
    from: () => makeChain(),
  },
}));

const { useRecommendations } = await import('./use-recommendations.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRecommendations', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastSelect = null;
    lastOrder = null;
  });

  test('starts in loading state with a valid surveyId', () => {
    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(() => useRecommendations(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('flattens dimension JOIN (dimension.code) into a top-level dimensionCode', async () => {
    nextResult = {
      data: [
        {
          id: 'rec-1',
          severity: 'high',
          title: 'Improve Clarity',
          body: 'Focus on consistent messaging',
          actions: ['Action 1', 'Action 2'],
          ccc_service_link: null,
          trust_ladder_link: null,
          priority: 1,
          dimension: { code: 'clarity' },
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const recs = result.current.data!;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.dimensionCode).toBe('clarity');
    expect(recs[0]!.title).toBe('Improve Clarity');
    expect(recs[0]!.actions).toEqual(['Action 1', 'Action 2']);
    expect(recs[0]!.priority).toBe(1);
  });

  test('defaults dimensionCode to "core" when dimension join is null (global rec)', async () => {
    nextResult = {
      data: [
        {
          id: 'rec-2',
          severity: 'medium',
          title: 'Global recommendation',
          body: 'Applies to all dimensions',
          actions: [],
          ccc_service_link: null,
          trust_ladder_link: null,
          priority: 2,
          dimension: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0]!.dimensionCode).toBe('core');
  });

  test('coerces non-array actions to an empty array', async () => {
    nextResult = {
      data: [
        {
          id: 'rec-3',
          severity: 'healthy',
          title: 'Bad actions payload',
          body: '',
          actions: null, // simulate malformed DB row
          ccc_service_link: null,
          trust_ladder_link: null,
          priority: 3,
          dimension: { code: 'core' },
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0]!.actions).toEqual([]);
  });

  test('requests the joined dimension(code) column in the select', async () => {
    const { result } = renderHook(() => useRecommendations('survey-9'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The hook uses a PostgREST alias: dimension:dimensions(code)
    expect(lastSelect).toContain('dimension:dimensions(code)');
  });

  test('orders rows by priority ascending', async () => {
    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastOrder).toEqual({ column: 'priority', options: { ascending: true } });
  });

  test('surfaces error state when the query fails', async () => {
    nextResult = { data: null, error: new Error('401 Unauthorized') };
    const { result } = renderHook(() => useRecommendations('survey-1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('401');
  });
});
