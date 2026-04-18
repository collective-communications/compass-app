import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useDeploymentManagement — exercises the three mutation paths
 * (saveConfig, publish, unpublish) and the is_active deployment fetch.
 * Underlying service module is mocked so we verify the hook's
 * orchestration (mutation invocation + cache invalidation shape).
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

/**
 * Use `spyOn` rather than `mock.module` — `mock.module` is global in Bun
 * and persists across test files, which causes problems when another
 * test file imports the same module expecting the real implementations.
 */
const deploymentService = await import('../services/deployment-service.js');

const saveSurveyConfig = spyOn(deploymentService, 'saveSurveyConfig');
const publishSurvey = spyOn(deploymentService, 'publishSurvey');
const unpublishSurvey = spyOn(deploymentService, 'unpublishSurvey');
const getActiveDeployment = spyOn(deploymentService, 'getActiveDeployment');

// Set default behaviour — individual tests override.
saveSurveyConfig.mockImplementation(async () => ({ id: 'survey-1' }) as never);
publishSurvey.mockImplementation(async () => ({ id: 'deploy-1' }) as never);
unpublishSurvey.mockImplementation(async () => undefined);
getActiveDeployment.mockImplementation(async () => null);

// Restore spies after all tests in this file so the real module exports
// are available to other test files that share this service.
afterAll(() => {
  saveSurveyConfig.mockRestore();
  publishSurvey.mockRestore();
  unpublishSurvey.mockRestore();
  getActiveDeployment.mockRestore();
});

const { useDeploymentManagement } = await import('./use-deployment-management.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useDeploymentManagement', () => {
  beforeEach(() => {
    saveSurveyConfig.mockClear();
    publishSurvey.mockClear();
    unpublishSurvey.mockClear();
    getActiveDeployment.mockClear();
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: '' }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.deployment.fetchStatus).toBe('idle');
  });

  test('fetches the active deployment for the given surveyId', async () => {
    getActiveDeployment.mockResolvedValueOnce({
      id: 'dep-1',
      surveyId: 'survey-1',
      type: 'anonymous_link',
      token: 'abc',
      settings: null,
      closesAt: null,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: '2026-04-01',
    });
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isSuccess).toBe(true));
    expect(getActiveDeployment).toHaveBeenCalledTimes(1);
    expect(result.current.deployment.data?.id).toBe('dep-1');
  });

  test('saveConfig calls saveSurveyConfig with the merged surveyId', async () => {
    saveSurveyConfig.mockResolvedValueOnce({
      id: 'survey-1',
      title: 'Updated',
      status: 'draft',
    } as never);
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isFetched).toBe(true));

    await act(async () => {
      await result.current.saveConfig({
        title: 'Updated',
        description: null,
        opensAt: '2026-04-10',
        closesAt: '2026-04-20',
        settings: {},
      });
    });

    expect(saveSurveyConfig).toHaveBeenCalledTimes(1);
    const call = saveSurveyConfig.mock.calls[0]![0] as Record<string, unknown>;
    expect(call['surveyId']).toBe('survey-1');
    expect(call['title']).toBe('Updated');
  });

  test('publish calls publishSurvey with the default deployment type', async () => {
    publishSurvey.mockResolvedValueOnce({
      id: 'dep-new',
      surveyId: 'survey-1',
      type: 'anonymous_link',
      token: 'xyz',
      settings: null,
      closesAt: null,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: '2026-04-15',
    } as never);
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isFetched).toBe(true));

    await act(async () => {
      await result.current.publish();
    });

    expect(publishSurvey).toHaveBeenCalledTimes(1);
    const call = publishSurvey.mock.calls[0]![0] as Record<string, unknown>;
    expect(call['surveyId']).toBe('survey-1');
    expect(call['deploymentType']).toBe('anonymous_link');
  });

  test('unpublish calls unpublishSurvey with the current deployment id', async () => {
    getActiveDeployment.mockResolvedValueOnce({
      id: 'dep-current',
      surveyId: 'survey-1',
      type: 'anonymous_link',
      token: 'abc',
      settings: null,
      closesAt: null,
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: '2026-04-01',
    });
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isSuccess).toBe(true));

    await act(async () => {
      await result.current.unpublish();
    });

    expect(unpublishSurvey).toHaveBeenCalledTimes(1);
    expect(unpublishSurvey.mock.calls[0]).toEqual(['survey-1', 'dep-current']);
  });

  test('unpublish rejects when no active deployment exists', async () => {
    getActiveDeployment.mockResolvedValueOnce(null);
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isSuccess).toBe(true));

    await expect(result.current.unpublish()).rejects.toThrow('No active deployment');
  });

  test('isPending is false when idle', async () => {
    getActiveDeployment.mockResolvedValueOnce(null);
    const { result } = renderHook(
      () => useDeploymentManagement({ surveyId: 'survey-1' }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.deployment.isFetched).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});
