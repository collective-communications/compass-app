import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import type { QuestionWithDimension } from '@compass/types';

/**
 * Tests for useQuestions — verifies disabled state, happy-path data load,
 * empty-list handling, and error surfacing.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let getQuestionsStub: (surveyId: string) => Promise<QuestionWithDimension[]> = async () => [];

const adapterModule = await import('../services/survey-engine-adapter.js');
const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      getQuestions: (surveyId: string) => getQuestionsStub(surveyId),
    }) as never,
);

afterAll(() => {
  createAdapterSpy.mockRestore();
});

const { useQuestions } = await import('./use-questions.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Hook hard-codes retry:2 — collapse retry delay so the error path
        // surfaces inside the waitFor window.
        retryDelay: 0,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeQuestion(id: string, order: number): QuestionWithDimension {
  return {
    id,
    surveyId: 'survey-1',
    text: `Question ${id}`,
    description: null,
    type: 'likert',
    reverseScored: false,
    options: null,
    required: true,
    displayOrder: order,
    subDimensionId: null,
    diagnosticFocus: null,
    recommendedAction: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    dimension: {
      id: `qd-${id}`,
      questionId: id,
      dimensionId: 'dim-core',
      weight: 1,
    },
    subDimension: null,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useQuestions', () => {
  beforeEach(() => {
    getQuestionsStub = async () => [];
  });

  test('is disabled (idle) when surveyId is undefined', () => {
    const { result } = renderHook(() => useQuestions(undefined), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('resolves to an empty array when adapter returns no rows', async () => {
    const { result } = renderHook(() => useQuestions('survey-empty'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  test('passes through the adapter response preserving order', async () => {
    const questions = [makeQuestion('q-1', 1), makeQuestion('q-2', 2), makeQuestion('q-3', 3)];
    getQuestionsStub = async () => questions;

    const { result } = renderHook(() => useQuestions('survey-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0]?.id).toBe('q-1');
    expect(result.current.data?.[2]?.id).toBe('q-3');
  });

  test('forwards the surveyId to the adapter', async () => {
    let receivedSurveyId = '';
    getQuestionsStub = async (surveyId) => {
      receivedSurveyId = surveyId;
      return [];
    };

    const { result } = renderHook(() => useQuestions('survey-xyz'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedSurveyId).toBe('survey-xyz');
  });

  test('surfaces error state when the adapter throws', async () => {
    getQuestionsStub = async () => {
      throw new Error('Failed to load questions: RLS');
    };

    const { result } = renderHook(() => useQuestions('survey-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('RLS');
  });
});
