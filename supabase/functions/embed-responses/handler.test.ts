/**
 * Tests for embedSurveyResponses orchestration.
 *
 * Exercises the RPC happy path, the client-side fallback, the empty-answer
 * no-op, and the embedding-provider failure path — the four branches flagged
 * by the Wave-4 review.
 *
 * The Supabase client is mocked with a chainable query builder that returns
 * per-call fixtures in order, same pattern as report-assembler.test.ts.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import { embedSurveyResponses, type EmbedFn } from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
}

let fromResults: MockResult[] = [];
let fromIndex = 0;
let rpcResult: MockResult = { data: null, error: null };
const upsertSpy: { calls: unknown[][] } = { calls: [] };

function makeChain(idx: number): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = self;
  chain.is = self;
  chain.neq = self;
  chain.not = self;
  chain.in = self;
  chain.order = self;
  chain.limit = self;
  chain.upsert = (rows: unknown, options: unknown) => {
    upsertSpy.calls.push([rows, options]);
    return Promise.resolve(fromResults[idx] ?? { data: null, error: null });
  };

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (r: unknown) => unknown,
  ) => {
    return Promise.resolve(fromResults[idx] ?? { data: null, error: null }).then(onFulfilled, onRejected);
  };

  return chain;
}

const client = {
  from: (_table: string) => {
    const idx = fromIndex++;
    return makeChain(idx);
  },
  rpc: (_fn: string, _args: unknown) => Promise.resolve(rpcResult),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
  rpcResult = { data: null, error: null };
  upsertSpy.calls.length = 0;
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const unembeddedAnswers = [
  { id: 'a1', response_id: 'r1', question_id: 'q1', text_value: 'Great culture' },
  { id: 'a2', response_id: 'r2', question_id: 'q1', text_value: 'Leadership cares' },
];

const stubEmbed: EmbedFn = async (texts) => texts.map(() => Array.from({ length: 4 }, () => 0.1));

// ─── Happy path (RPC) ───────────────────────────────────────────────────────

describe('embedSurveyResponses — happy path via RPC', () => {
  test('unembedded answers → embeddings generated and upserted', async () => {
    rpcResult = { data: unembeddedAnswers, error: null };
    fromResults = [
      { data: null, error: null }, // upsert result
    ];

    const result = await embedSurveyResponses(client, 'survey-1', stubEmbed);

    expect(result.surveyId).toBe('survey-1');
    expect(result.embeddingsCreated).toBe(2);
    expect(upsertSpy.calls).toHaveLength(1);

    const [rows, options] = upsertSpy.calls[0];
    expect(rows as unknown[]).toHaveLength(2);
    expect(options).toEqual({ onConflict: 'response_id,model_version' });
  });

  test('happy path SKIPS fallback (no double-fetch of answers table)', async () => {
    rpcResult = { data: unembeddedAnswers, error: null };
    fromResults = [{ data: null, error: null }]; // only upsert should hit `from()`

    await embedSurveyResponses(client, 'survey-1', stubEmbed);

    // RPC happy path consumes `from()` exactly once — for the upsert.
    // If the fallback ran, fromIndex would be ≥ 2 (answers + dialogue_embeddings
    // pre-check) before the upsert.
    expect(fromIndex).toBe(1);
  });
});

// ─── Fallback path ──────────────────────────────────────────────────────────

describe('embedSurveyResponses — RPC missing fallback', () => {
  test('falls back to answers-table query when RPC errors', async () => {
    rpcResult = { data: null, error: { message: 'function does not exist', code: '42883' } };
    fromResults = [
      { data: unembeddedAnswers, error: null }, // answers query
      { data: [], error: null }, // existing dialogue_embeddings (none)
      { data: null, error: null }, // upsert
    ];

    const result = await embedSurveyResponses(client, 'survey-1', stubEmbed);

    expect(result.embeddingsCreated).toBe(2);
    expect(upsertSpy.calls).toHaveLength(1);
  });

  test('fallback filters out answers that already have embeddings', async () => {
    rpcResult = { data: null, error: { message: 'rpc gone', code: '42883' } };
    fromResults = [
      { data: unembeddedAnswers, error: null },
      { data: [{ response_id: 'r1' }], error: null }, // r1 already embedded
      { data: null, error: null },
    ];

    const result = await embedSurveyResponses(client, 'survey-1', stubEmbed);

    expect(result.embeddingsCreated).toBe(1); // only r2
    const [rows] = upsertSpy.calls[0];
    expect((rows as { response_id: string }[])[0].response_id).toBe('r2');
  });
});

// ─── Empty answer set ───────────────────────────────────────────────────────

describe('embedSurveyResponses — empty answer set', () => {
  test('no pending answers via RPC → returns 0 and skips upsert', async () => {
    rpcResult = { data: [], error: null };

    const result = await embedSurveyResponses(client, 'survey-1', stubEmbed);

    expect(result.embeddingsCreated).toBe(0);
    expect(result.message).toBe('No new responses to embed');
    expect(upsertSpy.calls).toHaveLength(0);
  });

  test('fallback with no answers → returns 0', async () => {
    rpcResult = { data: null, error: { message: 'gone', code: '42883' } };
    fromResults = [
      { data: [], error: null }, // answers query empty
    ];

    const result = await embedSurveyResponses(client, 'survey-1', stubEmbed);

    expect(result.embeddingsCreated).toBe(0);
    expect(upsertSpy.calls).toHaveLength(0);
  });
});

// ─── Embedding provider failure ─────────────────────────────────────────────

describe('embedSurveyResponses — provider failure', () => {
  test('throws with provider message when embed() rejects', async () => {
    rpcResult = { data: unembeddedAnswers, error: null };
    const failingEmbed: EmbedFn = async () => {
      throw new Error('OpenAI API error: 500 internal');
    };

    await expect(embedSurveyResponses(client, 'survey-1', failingEmbed)).rejects.toThrow(
      /OpenAI API error/,
    );
    expect(upsertSpy.calls).toHaveLength(0);
  });

  test('throws when upsert fails', async () => {
    rpcResult = { data: unembeddedAnswers, error: null };
    fromResults = [{ data: null, error: { message: 'unique constraint' } }];

    await expect(embedSurveyResponses(client, 'survey-1', stubEmbed)).rejects.toThrow(
      /Failed to upsert embeddings/,
    );
  });
});
