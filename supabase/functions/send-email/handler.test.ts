/**
 * Tests for sendEmail orchestration.
 *
 * Covers:
 *   - Happy path: provider called with expected args, log transitions queued→sent
 *   - Provider 4xx → structured mapping returns 400 PROVIDER_REJECTED
 *   - Provider 5xx → structured mapping returns 503 PROVIDER_UNAVAILABLE
 *   - Legacy mapping: any provider failure → 500 SEND_FAILED (bit-for-bit
 *     compatible with the pre-refactor index.ts behavior)
 *   - Log insert failure → 500 LOG_ERROR (pre-send failure envelope)
 *
 * The provider is injected as a simple async function so tests can simulate
 * success, client_error, and server_error via `ProviderError`.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import {
  sendEmail,
  ProviderError,
  type SendProviderFn,
  type SendEmailRequest,
} from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
}

let fromResults: MockResult[] = [];
let fromIndex = 0;

function makeChain(idx: number): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;
  const get = (): MockResult => fromResults[idx] ?? { data: null, error: null };

  chain.select = self;
  chain.insert = self;
  chain.update = self;
  chain.eq = self;
  chain.single = () => Promise.resolve(get());

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (r: unknown) => unknown,
  ) => Promise.resolve(get()).then(onFulfilled, onRejected);

  return chain;
}

function makeClient() {
  return {
    from: (_table: string) => {
      const idx = fromIndex++;
      return makeChain(idx);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const req: SendEmailRequest = {
  to: 'user@test.com',
  subject: 'Hello',
  html: '<p>Body</p>',
  templateType: 'survey_invitation',
};

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('sendEmail — happy path', () => {
  test('provider called with expected args, log sets status to sent', async () => {
    fromResults = [
      { data: { id: 'log-1' }, error: null }, // insert → select → single
      { data: null, error: null }, // update to sent
    ];

    const received: Array<Record<string, unknown>> = [];
    const provider: SendProviderFn = async (args) => {
      received.push(args);
      return { messageId: 'resend-msg-1' };
    };

    const result = await sendEmail(makeClient(), req, provider);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.messageId).toBe('resend-msg-1');
    expect(result.body.logId).toBe('log-1');

    expect(received).toHaveLength(1);
    expect(received[0].to).toBe('user@test.com');
    expect(received[0].subject).toBe('Hello');
  });
});

// ─── Log insert failure ─────────────────────────────────────────────────────

describe('sendEmail — log insert failure', () => {
  test('log insert error → 500 LOG_ERROR without invoking provider', async () => {
    fromResults = [{ data: null, error: { message: 'unique constraint' } }];

    let providerCalled = false;
    const provider: SendProviderFn = async () => {
      providerCalled = true;
      return { messageId: 'x' };
    };

    const result = await sendEmail(makeClient(), req, provider);

    expect(result.status).toBe(500);
    expect((result.body as { error: string }).error).toBe('LOG_ERROR');
    expect(providerCalled).toBe(false);
  });
});

// ─── Provider 4xx (structured mapping) ──────────────────────────────────────

describe('sendEmail — provider 4xx (structured mapping)', () => {
  test('client_error → 400 PROVIDER_REJECTED', async () => {
    fromResults = [
      { data: { id: 'log-1' }, error: null },
      { data: null, error: null }, // update to failed
    ];

    const provider: SendProviderFn = async () => {
      throw new ProviderError('client_error', 'Resend 422: invalid recipient');
    };

    const result = await sendEmail(makeClient(), req, provider, { errorMapping: 'structured' });

    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe('PROVIDER_REJECTED');
    expect((result.body as { message: string }).message).toContain('invalid recipient');
  });
});

// ─── Provider 5xx (structured mapping) ──────────────────────────────────────

describe('sendEmail — provider 5xx (structured mapping)', () => {
  test('server_error → 503 PROVIDER_UNAVAILABLE (retryable)', async () => {
    fromResults = [
      { data: { id: 'log-1' }, error: null },
      { data: null, error: null },
    ];

    const provider: SendProviderFn = async () => {
      throw new ProviderError('server_error', 'Resend 502: upstream down');
    };

    const result = await sendEmail(makeClient(), req, provider, { errorMapping: 'structured' });

    expect(result.status).toBe(503);
    expect((result.body as { error: string }).error).toBe('PROVIDER_UNAVAILABLE');
    expect((result.body as { retryable: boolean }).retryable).toBe(true);
  });
});

// ─── Legacy mapping (backward compatibility with pre-refactor index.ts) ─────

describe('sendEmail — legacy error mapping', () => {
  test('any provider failure → 500 SEND_FAILED (default mode)', async () => {
    fromResults = [
      { data: { id: 'log-1' }, error: null },
      { data: null, error: null },
    ];

    const provider: SendProviderFn = async () => {
      throw new Error('Email delivery failed');
    };

    // Default is 'legacy'
    const result = await sendEmail(makeClient(), req, provider);

    expect(result.status).toBe(500);
    expect((result.body as { error: string }).error).toBe('SEND_FAILED');
    expect((result.body as { message: string }).message).toBe('Email delivery failed');
  });

  test('legacy mapping collapses 4xx and 5xx to 500', async () => {
    fromResults = [
      { data: { id: 'log-1' }, error: null },
      { data: null, error: null },
      { data: { id: 'log-2' }, error: null },
      { data: null, error: null },
    ];

    const p4xx: SendProviderFn = async () => {
      throw new ProviderError('client_error', '4xx');
    };
    const p5xx: SendProviderFn = async () => {
      throw new ProviderError('server_error', '5xx');
    };

    const r1 = await sendEmail(makeClient(), req, p4xx, { errorMapping: 'legacy' });
    const r2 = await sendEmail(makeClient(), req, p5xx, { errorMapping: 'legacy' });

    expect(r1.status).toBe(500);
    expect(r2.status).toBe(500);
    expect((r1.body as { error: string }).error).toBe('SEND_FAILED');
    expect((r2.body as { error: string }).error).toBe('SEND_FAILED');
  });
});
