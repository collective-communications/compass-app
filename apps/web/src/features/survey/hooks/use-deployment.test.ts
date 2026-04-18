import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import type { DeploymentResolution } from '@compass/types';

/**
 * Tests for useDeployment — exercises the query hook's happy path, disabled
 * state, and error surfacing. `spyOn` replaces `createSurveyEngineAdapter`
 * on the imported module without using `mock.module`, which is global in
 * Bun and would leak into other test files that import the real module.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

type ResolveFn = (token: string) => Promise<DeploymentResolution>;

let resolveDeploymentStub: ResolveFn = async () =>
  ({ status: 'not_found', message: 'stub' }) as DeploymentResolution;

const adapterModule = await import('../services/survey-engine-adapter.js');
const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      resolveDeployment: (token: string) => resolveDeploymentStub(token),
    }) as never,
);

// Spies must be restored after this file runs so other test files see
// the real adapter implementation.
afterAll(() => {
  createAdapterSpy.mockRestore();
});

const { useDeployment } = await import('./use-deployment.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Hook hard-codes retry:2 — override the delay so retries don't
        // blow past the 1s waitFor default.
        retryDelay: 0,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useDeployment', () => {
  beforeEach(() => {
    resolveDeploymentStub = async () =>
      ({ status: 'not_found', message: 'stub' }) as DeploymentResolution;
  });

  test('is disabled (idle) when token is undefined', () => {
    const { result } = renderHook(() => useDeployment(undefined), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  test('is disabled (idle) when token is empty string', () => {
    const { result } = renderHook(() => useDeployment(''), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  test('resolves to valid deployment payload on success', async () => {
    resolveDeploymentStub = async () =>
      ({
        status: 'valid',
        deployment: {
          id: 'dep-1',
          surveyId: 'survey-1',
          type: 'anonymous_link',
          token: 'abc',
          settings: null,
          closesAt: null,
          accessCount: 0,
          lastAccessedAt: null,
          createdAt: '2026-04-01',
        },
        survey: {
          id: 'survey-1',
          organizationId: 'org-1',
          title: 'Pulse Check',
          description: null,
          status: 'active',
          opensAt: null,
          closesAt: null,
          settings: null,
          scoresCalculated: false,
          scoresCalculatedAt: null,
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
          createdBy: null,
        },
      }) as DeploymentResolution;

    const { result } = renderHook(() => useDeployment('abc'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('valid');
    if (result.current.data?.status === 'valid') {
      expect(result.current.data.survey.title).toBe('Pulse Check');
    }
  });

  test('surfaces not_found status without treating it as an error', async () => {
    resolveDeploymentStub = async () =>
      ({ status: 'not_found', message: 'bad token' }) as DeploymentResolution;

    const { result } = renderHook(() => useDeployment('garbage'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.data?.status).toBe('not_found');
  });

  test('surfaces error state when the adapter throws', async () => {
    resolveDeploymentStub = async () => {
      throw new Error('network down');
    };

    const { result } = renderHook(() => useDeployment('abc'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('network down');
  });
});
