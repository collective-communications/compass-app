import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for useClientAccess hook.
 *
 * The hook queries organization_settings via supabase to determine
 * whether CC+C has enabled client results access for an organization.
 * We mock supabase and @tanstack/react-query to test the logic in isolation.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: { client_access_enabled: boolean } | null;
  error: null | Error;
}

let queryResult: MockResult = { data: null, error: null };

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = self;
  chain.single = () => Promise.resolve(queryResult);

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: (_table: string) => makeChain(),
  },
}));

/**
 * Mock @tanstack/react-query's useQuery to call queryFn synchronously
 * and return the result, respecting the `enabled` flag.
 */
let lastQueryFn: (() => Promise<boolean>) | null = null;
let lastEnabled: boolean = true;
let resolvedData: boolean | undefined = undefined;

mock.module('@tanstack/react-query', () => ({
  useQuery: (opts: { queryFn: () => Promise<boolean>; enabled: boolean }) => {
    lastQueryFn = opts.queryFn;
    lastEnabled = opts.enabled;
    return {
      data: resolvedData,
      isLoading: false,
      error: null,
    };
  },
}));

const { useClientAccess, clientAccessKeys } = await import('./use-client-access.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useClientAccess', () => {
  beforeEach(() => {
    queryResult = { data: null, error: null };
    resolvedData = undefined;
    lastQueryFn = null;
    lastEnabled = true;
  });

  test('returns false when organizationId is null', () => {
    resolvedData = undefined;
    const result = useClientAccess({ organizationId: null });

    expect(result).toBe(false);
    expect(lastEnabled).toBe(false);
  });

  test('returns true when org has client_access_enabled=true', async () => {
    queryResult = { data: { client_access_enabled: true }, error: null };
    resolvedData = true;

    const result = useClientAccess({ organizationId: 'org-1' });

    expect(result).toBe(true);
    expect(lastEnabled).toBe(true);
  });

  test('returns false when org has client_access_enabled=false', async () => {
    queryResult = { data: { client_access_enabled: false }, error: null };
    resolvedData = false;

    const result = useClientAccess({ organizationId: 'org-1' });

    expect(result).toBe(false);
  });

  test('returns false on query error', async () => {
    queryResult = { data: null, error: new Error('DB error') };
    resolvedData = undefined;

    const result = useClientAccess({ organizationId: 'org-1' });

    expect(result).toBe(false);
  });

  test('fetchClientAccessEnabled returns false on supabase error', async () => {
    queryResult = { data: null, error: new Error('network failure') };

    // Call the queryFn directly to test the fetcher
    useClientAccess({ organizationId: 'org-1' });
    expect(lastQueryFn).not.toBeNull();

    const fetchResult = await lastQueryFn!();
    expect(fetchResult).toBe(false);
  });

  test('fetchClientAccessEnabled returns true when client_access_enabled is true', async () => {
    queryResult = { data: { client_access_enabled: true }, error: null };

    useClientAccess({ organizationId: 'org-1' });
    expect(lastQueryFn).not.toBeNull();

    const fetchResult = await lastQueryFn!();
    expect(fetchResult).toBe(true);
  });

  test('fetchClientAccessEnabled returns false when client_access_enabled is false', async () => {
    queryResult = { data: { client_access_enabled: false }, error: null };

    useClientAccess({ organizationId: 'org-1' });
    const fetchResult = await lastQueryFn!();
    expect(fetchResult).toBe(false);
  });

  test('query key factory produces correct keys', () => {
    expect(clientAccessKeys.all).toEqual(['client-access']);
    expect(clientAccessKeys.org('org-1')).toEqual(['client-access', 'org-1']);
  });
});
