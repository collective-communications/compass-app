import { beforeEach, describe, expect, test } from 'bun:test';

const env = new Map<string, string>();

// @ts-expect-error - Deno shim for Edge auth tests under Bun.
globalThis.Deno = {
  env: {
    get: (key: string): string | undefined => env.get(key),
  },
};

import { authorize } from './auth.ts';

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
}

interface QueryChain {
  select: () => QueryChain;
  eq: () => Promise<MockResult>;
}

function makeRequest(token?: string): Request {
  return new Request('https://edge.test/send-invitations', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeClient(result: MockResult): {
  tables: string[];
  client: Parameters<typeof authorize>[1];
} {
  const tables: string[] = [];

  const chain: QueryChain = {
    select: (): QueryChain => chain,
    eq: (): Promise<MockResult> => Promise.resolve(result),
  };

  return {
    tables,
    client: {
      auth: {
        getUser: async (token: string) => ({
          data: { user: token === 'valid-jwt' ? { id: 'user-1' } : null },
          error: token === 'valid-jwt' ? null : { message: 'bad jwt' },
        }),
      },
      from: (table: string) => {
        tables.push(table);
        return chain;
      },
    } as unknown as Parameters<typeof authorize>[1],
  };
}

beforeEach(() => {
  env.clear();
});

describe('send-invitations authorize', () => {
  test('stale privileged profile but no org_members membership is denied', async () => {
    const { client, tables } = makeClient({ data: null, error: null });

    const result = await authorize(makeRequest('valid-jwt'), client);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
      await expect(result.error.json()).resolves.toMatchObject({
        error: 'UNAUTHORIZED',
        message: 'User org membership not found',
      });
    }
    expect(tables).toEqual(['org_members']);
    expect(tables).not.toContain('user_profiles');
  });

  test('valid required org_members membership is allowed', async () => {
    const { client } = makeClient({ data: [{ role: 'ccc_member' }], error: null });

    const result = await authorize(makeRequest('valid-jwt'), client);

    expect(result).toEqual({
      result: { authorized: true, userId: 'user-1', role: 'ccc_member' },
    });
  });

  test('insufficient membership role is denied', async () => {
    const { client } = makeClient({ data: [{ role: 'client_exec' }], error: null });

    const result = await authorize(makeRequest('valid-jwt'), client);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
      await expect(result.error.json()).resolves.toMatchObject({ error: 'FORBIDDEN' });
    }
  });

  test('allowed membership is honored when user has multiple memberships', async () => {
    const { client } = makeClient({
      data: [{ role: 'client_exec' }, { role: 'ccc_admin' }],
      error: null,
    });

    const result = await authorize(makeRequest('valid-jwt'), client);

    expect(result).toEqual({
      result: { authorized: true, userId: 'user-1', role: 'ccc_admin' },
    });
  });

  test('service role token is allowed without membership lookup', async () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-secret');
    const { client, tables } = makeClient({ data: null, error: null });

    const result = await authorize(makeRequest('service-secret'), client);

    expect(result).toEqual({
      result: { authorized: true, userId: 'service_role', role: 'service_role' },
    });
    expect(tables).toEqual([]);
  });
});
