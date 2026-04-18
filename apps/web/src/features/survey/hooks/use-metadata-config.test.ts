import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import type { MetadataConfig } from '@compass/types';

/**
 * Tests for useMetadataConfig — verifies it fetches organization metadata,
 * falls back to defaults when the adapter returns empties, and is disabled
 * when organizationId is missing.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let getMetadataConfigStub: (orgId: string) => Promise<MetadataConfig> = async () => ({
  departments: [],
  roles: [],
  locations: [],
  tenures: [],
});

const adapterModule = await import('../services/survey-engine-adapter.js');
const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      getMetadataConfig: (orgId: string) => getMetadataConfigStub(orgId),
    }) as never,
);

afterAll(() => {
  createAdapterSpy.mockRestore();
});

const { useMetadataConfig } = await import('./use-metadata-config.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useMetadataConfig', () => {
  beforeEach(() => {
    getMetadataConfigStub = async () => ({
      departments: [],
      roles: [],
      locations: [],
      tenures: [],
    });
  });

  test('is disabled (idle) when organizationId is undefined', () => {
    const { result } = renderHook(() => useMetadataConfig(undefined), {
      wrapper: makeWrapper(),
    });
    // Disabled query still surfaces placeholderData but fetchStatus is idle.
    expect(result.current.fetchStatus).toBe('idle');
  });

  test('returns placeholder (default config) before fetch resolves', () => {
    const { result } = renderHook(() => useMetadataConfig('org-1'), {
      wrapper: makeWrapper(),
    });
    // placeholderData is the default config — roles are non-empty.
    expect(result.current.data?.roles.length).toBeGreaterThan(0);
  });

  test('resolves to the adapter-provided config on success', async () => {
    getMetadataConfigStub = async () => ({
      departments: ['Engineering', 'Ops'],
      roles: ['IC', 'Manager'],
      locations: ['Remote'],
      tenures: ['< 1 year'],
    });

    const { result } = renderHook(() => useMetadataConfig('org-1'), {
      wrapper: makeWrapper(),
    });

    // With placeholderData, isSuccess is true immediately — wait for the
    // fetched payload by watching for the non-default departments array.
    await waitFor(() => {
      expect(result.current.data?.departments).toEqual(['Engineering', 'Ops']);
    });
    expect(result.current.data?.roles).toEqual(['IC', 'Manager']);
  });

  test('surfaces error state when the adapter throws', async () => {
    getMetadataConfigStub = async () => {
      throw new Error('org not found');
    };

    const { result } = renderHook(() => useMetadataConfig('missing-org'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('org not found');
  });
});
