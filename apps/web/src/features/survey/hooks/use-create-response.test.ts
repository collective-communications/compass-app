import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import type { RespondentMetadata } from '@compass/types';

/**
 * Tests for useCreateResponse — verifies the mutation wraps
 * adapter.saveResponse, passes metadata and session token through, and
 * surfaces errors on failure.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface SaveResponseParams {
  surveyId: string;
  deploymentId: string;
  answers: Record<string, unknown>;
  metadata?: RespondentMetadata;
  sessionToken?: string;
}

let saveResponseCalls: SaveResponseParams[] = [];
let saveResponseStub: (params: SaveResponseParams) => Promise<{ responseId: string }> = async (
  params,
) => ({ responseId: params.sessionToken ?? 'generated-id' });

const adapterModule = await import('../services/survey-engine-adapter.js');
const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      saveResponse: (params: SaveResponseParams) => {
        saveResponseCalls.push(params);
        return saveResponseStub(params);
      },
    }) as never,
);

afterAll(() => {
  createAdapterSpy.mockRestore();
});

const { useCreateResponse } = await import('./use-create-response.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

const metadata: RespondentMetadata = {
  department: 'Engineering',
  role: 'IC',
  location: 'Remote',
  tenure: '1-3 years',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useCreateResponse', () => {
  beforeEach(() => {
    saveResponseCalls = [];
    saveResponseStub = async (params) => ({
      responseId: params.sessionToken ?? 'generated-id',
    });
  });

  test('starts in idle state', () => {
    const { result } = renderHook(() => useCreateResponse(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  test('resolves with the response id from the adapter on success', async () => {
    saveResponseStub = async () => ({ responseId: 'resp-123' });

    const { result } = renderHook(() => useCreateResponse(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        surveyId: 'survey-1',
        deploymentId: 'dep-1',
        metadata,
        sessionToken: 'session-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.responseId).toBe('resp-123');
  });

  test('forwards metadata, session token, and ids to saveResponse', async () => {
    const { result } = renderHook(() => useCreateResponse(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        surveyId: 'survey-abc',
        deploymentId: 'dep-abc',
        metadata,
        sessionToken: 'session-abc',
      });
    });

    expect(saveResponseCalls).toHaveLength(1);
    const call = saveResponseCalls[0]!;
    expect(call.surveyId).toBe('survey-abc');
    expect(call.deploymentId).toBe('dep-abc');
    expect(call.sessionToken).toBe('session-abc');
    expect(call.metadata).toEqual(metadata);
  });

  test('sends an empty answers map for new responses', async () => {
    const { result } = renderHook(() => useCreateResponse(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        surveyId: 'survey-1',
        deploymentId: 'dep-1',
        metadata,
        sessionToken: 'session-1',
      });
    });

    expect(saveResponseCalls[0]?.answers).toEqual({});
  });

  test('surfaces error state when saveResponse rejects', async () => {
    saveResponseStub = async () => {
      throw new Error('Failed to create response: duplicate key');
    };

    const { result } = renderHook(() => useCreateResponse(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({
          surveyId: 'survey-1',
          deploymentId: 'dep-1',
          metadata,
          sessionToken: 'session-1',
        })
        .catch(() => {
          /* expected */
        });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('duplicate key');
  });
});
