import { describe, test, expect, mock, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useSurveyBuilder (query) + useReorderQuestions (mutation).
 *
 * The survey-builder hook is a thin query wrapper; the real complexity is
 * in useReorderQuestions, which implements drag-and-drop optimistic UI
 * with rollback. Both are covered in this file since they share the
 * surveyBuilderKeys contract.
 *
 * Note: `mock.module` is global in Bun and persists across test files —
 * we therefore avoid registering a module-level mock here. Instead we
 * `spyOn` the individual exports, which can be restored cleanly and
 * doesn't hide the rest of the module from other test files.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

const adminSurveyService = await import('../services/admin-survey-service.js');

const getSurveyBuilderDataSpy = spyOn(adminSurveyService, 'getSurveyBuilderData');
const reorderQuestionsSpy = spyOn(adminSurveyService, 'reorderQuestions');

// Default stub implementations — individual tests override as needed.
getSurveyBuilderDataSpy.mockImplementation(async () => ({
  survey: { id: 'survey-1', title: 'Test' },
  questions: [],
  dimensions: [],
  subDimensions: [],
  hasResponses: false,
}) as never);
reorderQuestionsSpy.mockImplementation(async () => undefined);

// Restore spies after all tests in this file to avoid leaking into other
// test files that share the admin-survey-service module.
afterAll(() => {
  getSurveyBuilderDataSpy.mockRestore();
  reorderQuestionsSpy.mockRestore();
});

const { useSurveyBuilder, surveyBuilderKeys } = await import('./use-survey-builder.js');
const { useReorderQuestions } = await import('./use-reorder-questions.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

interface HookEnv {
  wrapper: (props: PropsWithChildren) => ReactElement;
  client: QueryClient;
}

function makeEnv(): HookEnv {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  return { wrapper, client };
}

// ─── Tests: useSurveyBuilder ────────────────────────────────────────────────

describe('useSurveyBuilder', () => {
  beforeEach(() => {
    getSurveyBuilderDataSpy.mockClear();
  });

  test('is disabled when surveyId is empty', () => {
    const { wrapper } = makeEnv();
    const { result } = renderHook(() => useSurveyBuilder({ surveyId: '' }), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(getSurveyBuilderDataSpy).not.toHaveBeenCalled();
  });

  test('fetches builder data for a valid surveyId', async () => {
    getSurveyBuilderDataSpy.mockResolvedValueOnce({
      survey: { id: 'survey-1', title: 'Q1', status: 'draft' },
      questions: [],
      dimensions: [],
      subDimensions: [],
      hasResponses: false,
    } as never);
    const { wrapper } = makeEnv();
    const { result } = renderHook(
      () => useSurveyBuilder({ surveyId: 'survey-1' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getSurveyBuilderDataSpy).toHaveBeenCalledWith('survey-1');
    expect(result.current.data?.survey.id).toBe('survey-1');
  });

  test('surveyBuilderKeys.detail produces a survey-scoped query key', () => {
    expect(surveyBuilderKeys.detail('survey-1')).toEqual([
      'admin', 'survey-builder', 'survey-1',
    ]);
  });
});

// ─── Tests: useReorderQuestions (optimistic UI + rollback) ─────────────────

describe('useReorderQuestions (optimistic UI + rollback)', () => {
  beforeEach(() => {
    reorderQuestionsSpy.mockClear();
  });

  test('optimistically reorders questions in the cache before the mutation resolves', async () => {
    const { wrapper, client } = makeEnv();

    // Seed the cache with existing builder data.
    const key = surveyBuilderKeys.detail('survey-1');
    client.setQueryData(key, {
      survey: { id: 'survey-1' },
      questions: [
        { id: 'q-1', displayOrder: 1, text: 'Q1' },
        { id: 'q-2', displayOrder: 2, text: 'Q2' },
        { id: 'q-3', displayOrder: 3, text: 'Q3' },
      ],
      dimensions: [],
      subDimensions: [],
      hasResponses: false,
    });

    // Hold the mutation promise so we can observe the optimistic cache write.
    let resolveMutation: () => void = () => {};
    reorderQuestionsSpy.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolveMutation = () => resolve(undefined);
        }) as never,
    );

    const { result } = renderHook(() => useReorderQuestions(), { wrapper });

    await act(async () => {
      result.current.mutate({
        surveyId: 'survey-1',
        reorders: [
          { questionId: 'q-3', newOrder: 1 },
          { questionId: 'q-2', newOrder: 2 },
          { questionId: 'q-1', newOrder: 3 },
        ],
      });
      // Give the onMutate handler a tick to run.
      await Promise.resolve();
    });

    // Cache should now reflect the optimistic reorder (q-3 first).
    const optimistic = client.getQueryData(key) as {
      questions: Array<{ id: string; displayOrder: number }>;
    };
    expect(optimistic.questions.map((q) => q.id)).toEqual(['q-3', 'q-2', 'q-1']);

    // Finish the mutation and wait for settled state.
    await act(async () => {
      resolveMutation();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  test('rolls the cache back to the previous snapshot when the mutation rejects', async () => {
    const { wrapper, client } = makeEnv();
    const key = surveyBuilderKeys.detail('survey-1');
    const originalQuestions = [
      { id: 'q-1', displayOrder: 1, text: 'Q1' },
      { id: 'q-2', displayOrder: 2, text: 'Q2' },
    ];
    const originalSnapshot = {
      survey: { id: 'survey-1' },
      questions: originalQuestions,
      dimensions: [],
      subDimensions: [],
      hasResponses: false,
    };
    client.setQueryData(key, originalSnapshot);

    // After onError rollback, onSettled invalidates the query, which can
    // re-run `getSurveyBuilderData` on any observer. Return the same
    // original snapshot so the final cache state is deterministic.
    getSurveyBuilderDataSpy.mockResolvedValue(originalSnapshot as never);

    reorderQuestionsSpy.mockRejectedValueOnce(new Error('network failure') as never);

    // Capture the cache snapshots at each step.
    const capturedStates: Array<Array<string>> = [];
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (JSON.stringify(event.query.queryKey) === JSON.stringify(key)) {
        const data = event.query.state.data as
          | { questions: Array<{ id: string }> }
          | undefined;
        if (data?.questions) {
          capturedStates.push(data.questions.map((q) => q.id));
        }
      }
    });

    const { result } = renderHook(() => useReorderQuestions(), { wrapper });

    await act(async () => {
      result.current.mutate({
        surveyId: 'survey-1',
        reorders: [
          { questionId: 'q-2', newOrder: 1 },
          { questionId: 'q-1', newOrder: 2 },
        ],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    unsubscribe();

    // During the mutation we should observe the optimistic order ['q-2', 'q-1']
    // at some point, then rollback to the original order ['q-1', 'q-2'].
    expect(capturedStates).toContainEqual(['q-2', 'q-1']);
    expect(capturedStates[capturedStates.length - 1]).toEqual(['q-1', 'q-2']);
  });

  test('invalidates the survey-builder detail query on settle (success path)', async () => {
    const { wrapper, client } = makeEnv();
    const key = surveyBuilderKeys.detail('survey-1');
    client.setQueryData(key, {
      survey: { id: 'survey-1' },
      questions: [
        { id: 'q-1', displayOrder: 1 },
        { id: 'q-2', displayOrder: 2 },
      ],
      dimensions: [],
      subDimensionss: [],
      hasResponses: false,
    });

    reorderQuestionsSpy.mockResolvedValueOnce(undefined as never);
    const invalidateSpy = mock(client.invalidateQueries.bind(client));
    client.invalidateQueries = invalidateSpy as typeof client.invalidateQueries;

    const { result } = renderHook(() => useReorderQuestions(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        surveyId: 'survey-1',
        reorders: [{ questionId: 'q-1', newOrder: 1 }],
      });
    });

    // Verify some invalidateQueries call targeted the detail key.
    const calls = invalidateSpy.mock.calls;
    const hitKey = calls.some((args) => {
      const first = args[0] as { queryKey?: unknown } | undefined;
      return JSON.stringify(first?.queryKey) === JSON.stringify(key);
    });
    expect(hitKey).toBe(true);
  });

  test('calls reorderQuestions with the survey id and reorder array', async () => {
    const { wrapper } = makeEnv();
    reorderQuestionsSpy.mockResolvedValueOnce(undefined as never);
    const { result } = renderHook(() => useReorderQuestions(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        surveyId: 'survey-9',
        reorders: [{ questionId: 'qa', newOrder: 5 }],
      });
    });

    expect(reorderQuestionsSpy).toHaveBeenCalledTimes(1);
    expect(reorderQuestionsSpy.mock.calls[0]).toEqual([
      'survey-9',
      [{ questionId: 'qa', newOrder: 5 }],
    ]);
  });
});
