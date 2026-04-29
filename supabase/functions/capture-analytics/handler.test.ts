import { describe, expect, test } from 'bun:test';

// @ts-expect-error - Deno shim for modules imported by Edge Function tests.
globalThis.Deno = globalThis.Deno ?? {
  env: { get: (): string => '' },
  serve: (): void => undefined,
};

import { captureAnalytics } from './handler.ts';

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

function makeClient(result: { error: null | { message: string } } = { error: null }): {
  calls: RpcCall[];
  client: never;
} {
  const calls: RpcCall[] = [];
  return {
    calls,
    client: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        return { data: null, error: result.error };
      },
    } as never,
  };
}

describe('captureAnalytics', () => {
  test('records a valid whitelisted event through the aggregate RPC', async () => {
    const { client, calls } = makeClient();

    const result = await captureAnalytics(client, {
      eventName: 'route_viewed',
      surface: 'survey',
      routeTemplate: '/s/$token',
      buildEnv: 'test',
    });

    expect(result.status).toBe(202);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      fn: 'record_analytics_event',
      args: {
        p_event: {
          eventName: 'route_viewed',
          surface: 'survey',
          routeTemplate: '/s/$token',
          buildEnv: 'test',
        },
      },
    });
  });

  test('rejects forbidden field names before calling the database', async () => {
    const { client, calls } = makeClient();

    const result = await captureAnalytics(client, {
      eventName: 'route_viewed',
      surface: 'survey',
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('FORBIDDEN_FIELDS');
    expect(result.body.fields).toEqual(['userId']);
    expect(calls).toHaveLength(0);
  });

  test('rejects nested forbidden fields before calling the database', async () => {
    const { client, calls } = makeClient();

    const result = await captureAnalytics(client, {
      eventName: 'survey_open_text_submitted',
      surface: 'survey',
      nested: { openText: 'This must never be captured.' },
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('FORBIDDEN_FIELDS');
    expect(result.body.fields).toEqual(['nested.openText']);
    expect(calls).toHaveLength(0);
  });

  test('rejects raw respondent paths and requires route templates', async () => {
    const { client, calls } = makeClient();

    const result = await captureAnalytics(client, {
      eventName: 'route_viewed',
      surface: 'survey',
      routeTemplate: '/s/real-token-value',
    });

    expect(result.status).toBe(400);
    expect(result.body.fields).toEqual(['routeTemplate']);
    expect(calls).toHaveLength(0);
  });

  test('maps RPC failure to a generic error without leaking database detail', async () => {
    const { client } = makeClient({ error: { message: 'permission denied for table' } });

    const result = await captureAnalytics(client, {
      eventName: 'route_viewed',
      surface: 'public',
      routeTemplate: '/',
    });

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: 'CAPTURE_FAILED',
      message: 'Analytics event could not be recorded.',
    });
  });
});
