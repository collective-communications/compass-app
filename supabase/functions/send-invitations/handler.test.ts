/**
 * Tests for sendInvitations orchestration.
 *
 * Covers:
 *   - Happy path: pending recipients → send is called per recipient
 *   - Closed survey: survey select returns error → 404 NOT_FOUND
 *   - Missing template: 500 CONFIG_ERROR
 *   - No recipients: 200 with `{ sent: 0, failed: 0 }`
 *   - Partial send failure: send throws for one recipient → `{ sent, failed, errors }` envelope
 *
 * Supabase mock: scripted per-call fixtures matching the sequence of
 * `from()`, `select()`, `eq()`, `.single()/.then()`. Batch delay is forced to
 * 0ms so tests run fast.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import { sendInvitations, type SendFn, type SendInvitationArgs } from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
  count?: number;
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
  chain.upsert = self;
  chain.delete = self;
  chain.eq = self;
  chain.in = self;
  chain.not = self;
  chain.is = self;
  chain.neq = self;
  chain.or = self;
  chain.order = self;
  chain.limit = self;
  chain.single = () => Promise.resolve(get());
  chain.maybeSingle = () => Promise.resolve(get());

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

const baseInput = {
  surveyId: 'survey-1',
  deploymentId: 'deploy-1',
  appUrl: 'https://app.test',
};

const surveyRow = { id: 'survey-1', title: 'Q1', organization_id: 'org-1', closes_at: '2026-05-01' };
const deploymentRow = { id: 'deploy-1', token: 'tok-abc' };
const orgRow = { name: 'Acme & Co.' };
const templateRow = {
  subject: 'You are invited to {{organization_name}}',
  html_body: '<p>Hi {{recipient_name}}, take the survey: {{survey_link}}</p>',
};
const twoRecipients = [
  { id: 'rec-1', email: 'a@test.com', name: 'Alice' },
  { id: 'rec-2', email: 'b@test.com', name: null },
];

// Sequence of fromResults for a full happy path:
//   [0] surveys
//   [1] deployments
//   [2] organizations
//   [3] email_templates
//   [4] survey_recipients
//   [5] survey_recipients update (after batch)
//   [6] email_log insert (success log)
function happyPathFixtures(recipients = twoRecipients): MockResult[] {
  return [
    { data: surveyRow, error: null },
    { data: deploymentRow, error: null },
    { data: orgRow, error: null },
    { data: [templateRow], error: null },
    { data: recipients, error: null },
    { data: null, error: null }, // update
    { data: null, error: null }, // email_log insert
  ];
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('sendInvitations — happy path', () => {
  test('valid payload → send is called for each recipient', async () => {
    fromResults = happyPathFixtures();

    const sent: SendInvitationArgs[] = [];
    const send: SendFn = async (args) => {
      sent.push(args);
    };

    const result = await sendInvitations(makeClient(), baseInput, { send, batchDelayMs: 0 });

    expect(result.status).toBe(200);
    expect(result.body.sent).toBe(2);
    expect(result.body.failed).toBe(0);
    expect(sent).toHaveLength(2);
    expect(sent[0].to).toBe('a@test.com');
    expect(sent[0].templateType).toBe('survey_invitation');
  });

  test('template variables are rendered from row context', async () => {
    fromResults = happyPathFixtures();

    const sent: SendInvitationArgs[] = [];
    const result = await sendInvitations(
      makeClient(),
      baseInput,
      { send: async (args) => void sent.push(args), batchDelayMs: 0 },
    );

    expect(result.status).toBe(200);
    // Subject contains escaped org name
    expect(sent[0].subject).toContain('Acme &amp; Co.');
    // Body contains survey link with deployment token
    expect(sent[0].html).toContain('https://app.test/s/tok-abc');
    // Alice name rendered
    expect(sent[0].html).toContain('Alice');
  });
});

// ─── Failure paths ──────────────────────────────────────────────────────────

describe('sendInvitations — failure paths', () => {
  test('survey not found → 404', async () => {
    fromResults = [{ data: null, error: { message: 'not found', code: 'PGRST116' } }];
    const result = await sendInvitations(makeClient(), baseInput, { send: async () => {}, batchDelayMs: 0 });

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBe('NOT_FOUND');
    expect((result.body as { message: string }).message).toBe('Survey not found');
  });

  test('deployment not found → 404', async () => {
    fromResults = [
      { data: surveyRow, error: null },
      { data: null, error: { message: 'not found' } },
    ];
    const result = await sendInvitations(makeClient(), baseInput, { send: async () => {}, batchDelayMs: 0 });

    expect(result.status).toBe(404);
    expect((result.body as { message: string }).message).toBe('Deployment not found');
  });

  test('no template configured → 500 CONFIG_ERROR', async () => {
    fromResults = [
      { data: surveyRow, error: null },
      { data: deploymentRow, error: null },
      { data: orgRow, error: null },
      { data: [], error: null }, // empty templates array
    ];
    const result = await sendInvitations(makeClient(), baseInput, { send: async () => {}, batchDelayMs: 0 });

    expect(result.status).toBe(500);
    expect((result.body as { error: string }).error).toBe('CONFIG_ERROR');
  });

  test('no pending recipients → 200 with sent=0', async () => {
    fromResults = [
      { data: surveyRow, error: null },
      { data: deploymentRow, error: null },
      { data: orgRow, error: null },
      { data: [templateRow], error: null },
      { data: [], error: null },
    ];
    const result = await sendInvitations(makeClient(), baseInput, { send: async () => {}, batchDelayMs: 0 });

    expect(result.status).toBe(200);
    expect(result.body.sent).toBe(0);
    expect(result.body.failed).toBe(0);
  });

  test('send throws for one recipient → partial failure, NOT a 500', async () => {
    fromResults = happyPathFixtures();

    const send: SendFn = async (args) => {
      if (args.to === 'b@test.com') throw new Error('Resend 4xx rejected');
    };

    const result = await sendInvitations(makeClient(), baseInput, { send, batchDelayMs: 0 });

    expect(result.status).toBe(200);
    expect(result.body.sent).toBe(1);
    expect(result.body.failed).toBe(1);
    const errors = result.body.errors as string[];
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Resend 4xx rejected');
  });

  test('all sends fail → status still 200 with partial failure envelope', async () => {
    fromResults = happyPathFixtures();

    const send: SendFn = async () => {
      throw new Error('provider down');
    };

    const result = await sendInvitations(makeClient(), baseInput, { send, batchDelayMs: 0 });

    expect(result.status).toBe(200);
    expect(result.body.sent).toBe(0);
    expect(result.body.failed).toBe(2);
  });
});
