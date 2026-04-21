import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useOrgSettings.
 *
 * Wave 1.3 changed the fetch from `.single()` to `.maybeSingle()` and the
 * save path from `update` to `upsert`, so:
 *   - missing-row → defaults + needsCreate=true
 *   - existing-row → toOrgSettings(row) + needsCreate=false
 *   - updateClientAccess → upsert payload carries `organization_id` + flag
 *   - query error (not a missing-row) → propagates to `error`
 *
 * The chain mock captures the call that updateClientAccess ultimately
 * makes so we can assert on the upsert shape. Debounce is 500ms inside
 * the hook; we wait for the mutation to land with `waitFor`.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string };
}

interface CallLog {
  table: string | null;
  lastUpsertPayload: unknown;
  lastUpsertOptions: unknown;
  lastOperation: 'select' | 'upsert' | null;
}

let fetchResult: MockResult = { data: null, error: null };
let upsertResult: MockResult = { data: null, error: null };
const callLog: CallLog = {
  table: null,
  lastUpsertPayload: null,
  lastUpsertOptions: null,
  lastOperation: null,
};

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = (): Record<string, unknown> => chain;

  chain.select = self;
  chain.eq = self;
  chain.upsert = (payload: unknown, options: unknown) => {
    callLog.lastUpsertPayload = payload;
    callLog.lastUpsertOptions = options;
    callLog.lastOperation = 'upsert';
    return chain;
  };
  chain.maybeSingle = (): Promise<MockResult> => Promise.resolve(fetchResult);
  chain.single = (): Promise<MockResult> => Promise.resolve(upsertResult);

  return chain;
}

mock.module('../../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      callLog.table = table;
      callLog.lastOperation = 'select';
      return makeChain();
    },
  },
}));

// Silence the logger — no mock assertion needed, we only care that the
// hook surfaces errors via the `error` return slot.
mock.module('../../../../lib/logger', () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

const { useOrgSettings } = await import('./use-org-settings.js');

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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useOrgSettings — fetch', () => {
  beforeEach(() => {
    fetchResult = { data: null, error: null };
    upsertResult = { data: null, error: null };
    callLog.table = null;
    callLog.lastUpsertPayload = null;
    callLog.lastUpsertOptions = null;
    callLog.lastOperation = null;
  });

  test('existing row → needsCreate=false, settings mapped from row', async () => {
    fetchResult = {
      data: {
        id: 'os-1',
        organization_id: 'org-1',
        metadata_departments: [{ id: 'd1', label: 'Engineering', sortOrder: 0 }],
        metadata_roles: [],
        metadata_locations: [],
        metadata_tenure_bands: [],
        display_name: 'Acme Corp',
        logo_url: 'https://acme.example/logo.png',
        client_access_enabled: true,
        updated_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    };

    const { result } = renderHook(() => useOrgSettings('org-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.needsCreate).toBe(false);
    expect(result.current.settings).toBeDefined();
    expect(result.current.settings!.orgId).toBe('org-1');
    expect(result.current.settings!.branding.displayName).toBe('Acme Corp');
    expect(result.current.settings!.clientAccessEnabled).toBe(true);
    expect(result.current.settings!.metadata.departments).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  test('missing row (maybeSingle returns null) → needsCreate=true + defaults', async () => {
    fetchResult = { data: null, error: null };

    const { result } = renderHook(() => useOrgSettings('org-xyz'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.needsCreate).toBe(true);
    expect(result.current.settings).toBeDefined();
    expect(result.current.settings!.orgId).toBe('org-xyz');
    expect(result.current.settings!.clientAccessEnabled).toBe(false);
    expect(result.current.settings!.branding.displayName).toBe('');
    expect(result.current.settings!.metadata.departments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test('real DB error → propagates to `error`, needsCreate stays false', async () => {
    fetchResult = { data: null, error: { message: 'connection refused' } };

    const { result } = renderHook(() => useOrgSettings('org-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('connection refused');
    expect(result.current.needsCreate).toBe(false);
  });
});

describe('useOrgSettings — updateClientAccess', () => {
  beforeEach(() => {
    fetchResult = {
      data: {
        id: 'os-1',
        organization_id: 'org-1',
        metadata_departments: [],
        metadata_roles: [],
        metadata_locations: [],
        metadata_tenure_bands: [],
        display_name: '',
        logo_url: null,
        client_access_enabled: false,
        updated_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    };
    upsertResult = {
      data: {
        id: 'os-1',
        organization_id: 'org-1',
        metadata_departments: [],
        metadata_roles: [],
        metadata_locations: [],
        metadata_tenure_bands: [],
        display_name: '',
        logo_url: null,
        client_access_enabled: true,
        updated_at: '2026-03-02T00:00:00Z',
      },
      error: null,
    };
    callLog.table = null;
    callLog.lastUpsertPayload = null;
    callLog.lastUpsertOptions = null;
    callLog.lastOperation = null;
  });

  test('invokes upsert (not bare update) with organization_id in payload', async () => {
    const { result } = renderHook(() => useOrgSettings('org-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateClientAccess(true);
    });

    // Debounce is 500ms — wait a touch past that before asserting.
    await waitFor(
      () => {
        expect(callLog.lastOperation).toBe('upsert');
      },
      { timeout: 1500 },
    );

    expect(callLog.lastUpsertPayload).toMatchObject({
      organization_id: 'org-1',
      client_access_enabled: true,
    });
    // `onConflict: 'organization_id'` is required for upsert-merge semantics.
    expect(callLog.lastUpsertOptions).toMatchObject({ onConflict: 'organization_id' });
  });
});
