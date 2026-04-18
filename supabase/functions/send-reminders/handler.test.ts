/**
 * Tests for sendReminders orchestration.
 *
 * Covers:
 *   - Happy path: 1 survey × 3 recipients → 3 sends, 1 update, 1 log insert
 *   - 2 surveys processed: independent lookups fire in parallel (verified via
 *     call-index interleaving on the mock)
 *   - Per-recipient failure isolation: middle recipient's send rejects →
 *     totalSent=2, totalFailed=1, successIds = [first, last]
 *   - Empty recipients list → no sends, no update, totalSent=0
 *   - Template missing → no sends; error row in result; other surveys still processed
 *   - Deployment missing → same as template missing
 *   - shouldSkipReminder true for all → survey counted in `skipped`, not `surveysProcessed`
 *
 * Supabase mock: scripted per-call fixtures matching the sequence of `from()`
 * invocations. The mock also records the order each `from()` call's terminal
 * awaited result is produced, so parallelism inside a single survey can be
 * asserted by examining interleaving.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import {
  sendReminders,
  type SendFn,
  type SendRemindersInput,
} from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
  /** Optional label so tests can assert call ordering by from() table. */
  table?: string;
}

let fromResults: MockResult[] = [];
let fromIndex = 0;
/**
 * Recorded in order as each chain's terminal result is awaited. For tests
 * that want to assert parallelism, two calls that appeared in `Promise.all`
 * will still resolve in a predictable order because microtasks are serial —
 * but this is still the minimal way to prove all three fired before the
 * fourth (recipient) query.
 */
let resolveOrder: string[] = [];
let fromCallTables: string[] = [];

function makeChain(idx: number, table: string): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;
  const get = (): MockResult => {
    resolveOrder.push(table);
    return fromResults[idx] ?? { data: null, error: null };
  };

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
    from: (table: string) => {
      const idx = fromIndex++;
      fromCallTables.push(table);
      return makeChain(idx, table);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
  resolveOrder = [];
  fromCallTables = [];
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-16T12:00:00Z');
// 3 days before NOW → daysBetween returns 3, matches `schedule: [3]`.
const INVITED_AT = '2026-04-13T12:00:00Z';

const baseInput: SendRemindersInput = {
  appUrl: 'https://app.test',
  now: NOW,
};

const surveyRow = {
  id: 'survey-1',
  title: 'Q1',
  organization_id: 'org-1',
  closes_at: '2026-05-01',
  reminder_schedule: [3],
};
const survey2Row = {
  id: 'survey-2',
  title: 'Q2',
  organization_id: 'org-2',
  closes_at: '2026-06-01',
  reminder_schedule: [3],
};
const deploymentRow = { id: 'deploy-1', token: 'tok-abc' };
const deployment2Row = { id: 'deploy-2', token: 'tok-xyz' };
const orgRow = { name: 'Acme & Co.' };
const org2Row = { name: 'Globex' };
const templateRow = {
  subject: 'Reminder: {{organization_name}}',
  html_body: '<p>Hi {{recipient_name}}, take the survey: {{survey_link}}</p>',
};
const threeRecipients = [
  { id: 'rec-1', email: 'a@test.com', name: 'Alice', invitation_sent_at: INVITED_AT, reminder_sent_at: null },
  { id: 'rec-2', email: 'b@test.com', name: 'Bob', invitation_sent_at: INVITED_AT, reminder_sent_at: null },
  { id: 'rec-3', email: 'c@test.com', name: null, invitation_sent_at: INVITED_AT, reminder_sent_at: null },
];

/**
 * Fixture sequence for one survey's full happy path:
 *   [0] surveys (outer list)
 *   [1] deployments   ┐
 *   [2] organizations ├─ Promise.all (order within the triple is NOT guaranteed
 *   [3] email_templates┘   in production, but with our serial mock the resolve
 *                           order matches call order)
 *   [4] survey_recipients (sequential — depends on deployment.id)
 *   [5] survey_recipients update (batch success)
 *   [6] email_log insert (success rows)
 */
function oneSurveyHappy(recipients = threeRecipients): MockResult[] {
  return [
    { data: [surveyRow], error: null, table: 'surveys' },
    { data: deploymentRow, error: null, table: 'deployments' },
    { data: orgRow, error: null, table: 'organizations' },
    { data: [templateRow], error: null, table: 'email_templates' },
    { data: recipients, error: null, table: 'survey_recipients' },
    { data: null, error: null, table: 'survey_recipients' }, // update
    { data: null, error: null, table: 'email_log' },
  ];
}

function mkSend(capture: Array<{ to: string; subject: string; html: string }>): SendFn {
  return async (msg) => {
    capture.push(msg);
    return { id: `msg-${capture.length}`, error: null };
  };
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('sendReminders — happy path', () => {
  test('1 survey × 3 recipients → 3 sends, 1 update, 1 log insert', async () => {
    fromResults = oneSurveyHappy();
    const sent: Array<{ to: string; subject: string; html: string }> = [];
    const send = mkSend(sent);

    const result = await sendReminders(makeClient(), baseInput, { send, batchDelayMs: 0 });

    expect(result.totalSent).toBe(3);
    expect(result.totalFailed).toBe(0);
    expect(result.surveysProcessed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);

    expect(sent).toHaveLength(3);
    expect(sent.map((s) => s.to).sort()).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);

    // Verify the DB call shape: one surveys select, three parallel lookups,
    // one recipients query, one update, one log insert = 7 calls.
    expect(fromCallTables).toEqual([
      'surveys',
      'deployments',
      'organizations',
      'email_templates',
      'survey_recipients',
      'survey_recipients',
      'email_log',
    ]);
  });

  test('template variables rendered from row context', async () => {
    fromResults = oneSurveyHappy();
    const sent: Array<{ to: string; subject: string; html: string }> = [];
    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.totalSent).toBe(3);
    // Escaped org name in subject
    expect(sent[0].subject).toContain('Acme &amp; Co.');
    // Survey link contains the deployment token
    expect(sent[0].html).toContain('https://app.test/s/tok-abc');
    // Named recipient rendered
    expect(sent[0].html).toContain('Alice');
  });
});

// ─── 2 surveys / parallelism ────────────────────────────────────────────────

describe('sendReminders — multi-survey parallelism', () => {
  test('2 surveys processed: parallel lookups fire before recipient query', async () => {
    fromResults = [
      { data: [surveyRow, survey2Row], error: null, table: 'surveys' },
      // Survey 1: parallel triple + recipients + update + log
      { data: deploymentRow, error: null, table: 'deployments' },
      { data: orgRow, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
      { data: [threeRecipients[0]], error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'email_log' },
      // Survey 2: same shape
      { data: deployment2Row, error: null, table: 'deployments' },
      { data: org2Row, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
      { data: [threeRecipients[1]], error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'email_log' },
    ];
    const sent: Array<{ to: string; subject: string; html: string }> = [];

    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.surveysProcessed).toBe(2);
    expect(result.totalSent).toBe(2);

    // Interleaving assertion: within each survey, the three parallel lookups
    // (deployments, organizations, email_templates) must ALL resolve before
    // the recipient query for that survey. Because our mock serializes
    // resolution in call order, we just prove that the recipient call comes
    // 4th within each survey's fixture block.
    //
    // resolveOrder for one survey block: [deployments, organizations,
    // email_templates, survey_recipients, survey_recipients, email_log]
    const survey1Block = resolveOrder.slice(1, 7);
    expect(survey1Block.slice(0, 3).sort()).toEqual([
      'deployments',
      'email_templates',
      'organizations',
    ]);
    expect(survey1Block[3]).toBe('survey_recipients');

    const survey2Block = resolveOrder.slice(7, 13);
    expect(survey2Block.slice(0, 3).sort()).toEqual([
      'deployments',
      'email_templates',
      'organizations',
    ]);
    expect(survey2Block[3]).toBe('survey_recipients');
  });
});

// ─── Per-recipient failure isolation ────────────────────────────────────────

describe('sendReminders — per-recipient failure isolation', () => {
  test('middle recipient rejects → totalSent=2, totalFailed=1, successIds = [first, last]', async () => {
    fromResults = [
      ...oneSurveyHappy(),
      // Extra fixture: failure log insert (one row) happens in addition to the
      // success log insert when there are any failures.
      { data: null, error: null, table: 'email_log' },
    ];

    const send: SendFn = async (msg) => {
      if (msg.to === 'b@test.com') throw new Error('Resend 4xx');
      return { id: 'ok', error: null };
    };

    // Capture the ids passed to `.in('id', successIds)` on the update call.
    // We do this by wrapping makeClient with a proxy that records update args.
    let capturedInIds: string[] | null = null;
    const baseClient = makeClient();
    const client = {
      from: (table: string) => {
        const chain = baseClient.from(table);
        const origIn = chain.in;
        chain.in = (...args: unknown[]) => {
          if (table === 'survey_recipients' && Array.isArray(args[1])) {
            capturedInIds = args[1] as string[];
          }
          return origIn.apply(chain, args);
        };
        return chain;
      },
    };

    const result = await sendReminders(client, baseInput, { send, batchDelayMs: 0 });

    expect(result.totalSent).toBe(2);
    expect(result.totalFailed).toBe(1);
    expect(result.surveysProcessed).toBe(1);

    expect(capturedInIds).toEqual(['rec-1', 'rec-3']);
  });

  test('send returns {error} → recorded as failure, not success', async () => {
    fromResults = [
      ...oneSurveyHappy(),
      { data: null, error: null, table: 'email_log' },
    ];

    const send: SendFn = async (msg) => {
      if (msg.to === 'b@test.com') return { id: null, error: 'provider down' };
      return { id: 'ok', error: null };
    };

    const result = await sendReminders(makeClient(), baseInput, { send, batchDelayMs: 0 });

    expect(result.totalSent).toBe(2);
    expect(result.totalFailed).toBe(1);
  });
});

// ─── Empty recipients ───────────────────────────────────────────────────────

describe('sendReminders — empty recipients', () => {
  test('no recipients → no sends, no update, skipped counter bumps', async () => {
    fromResults = [
      { data: [surveyRow], error: null, table: 'surveys' },
      { data: deploymentRow, error: null, table: 'deployments' },
      { data: orgRow, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
      { data: [], error: null, table: 'survey_recipients' },
    ];
    const sent: Array<{ to: string; subject: string; html: string }> = [];

    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.totalSent).toBe(0);
    expect(result.surveysProcessed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(sent).toHaveLength(0);
    // Should NOT have called survey_recipients update or email_log insert.
    expect(fromCallTables).toEqual([
      'surveys',
      'deployments',
      'organizations',
      'email_templates',
      'survey_recipients',
    ]);
  });
});

// ─── Template missing ───────────────────────────────────────────────────────

describe('sendReminders — missing template', () => {
  test('template missing → error in result; other surveys still processed', async () => {
    fromResults = [
      { data: [surveyRow, survey2Row], error: null, table: 'surveys' },
      // Survey 1: no template
      { data: deploymentRow, error: null, table: 'deployments' },
      { data: orgRow, error: null, table: 'organizations' },
      { data: [], error: null, table: 'email_templates' },
      // Survey 2: full happy path (single recipient)
      { data: deployment2Row, error: null, table: 'deployments' },
      { data: org2Row, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
      { data: [threeRecipients[0]], error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'survey_recipients' },
      { data: null, error: null, table: 'email_log' },
    ];
    const sent: Array<{ to: string; subject: string; html: string }> = [];

    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].surveyId).toBe('survey-1');
    expect(result.errors[0].message).toContain('template');

    expect(result.totalSent).toBe(1);
    expect(result.surveysProcessed).toBe(1); // survey-2 only
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('a@test.com');
  });
});

// ─── Deployment missing ─────────────────────────────────────────────────────

describe('sendReminders — missing deployment', () => {
  test('deployment missing → error in result; no sends for that survey', async () => {
    fromResults = [
      { data: [surveyRow], error: null, table: 'surveys' },
      { data: null, error: null, table: 'deployments' }, // maybeSingle → null
      { data: orgRow, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
    ];
    const sent: Array<{ to: string; subject: string; html: string }> = [];

    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].surveyId).toBe('survey-1');
    expect(result.errors[0].message).toContain('Deployment');
    expect(result.totalSent).toBe(0);
    expect(result.surveysProcessed).toBe(0);
    expect(sent).toHaveLength(0);
  });
});

// ─── shouldSkipReminder path ────────────────────────────────────────────────

describe('sendReminders — all recipients within dedup window', () => {
  test('all recipients already reminded in last 23h → survey counted as skipped', async () => {
    // Reminder sent 1 hour ago → shouldSkipReminder returns true for all.
    const lastReminder = '2026-04-16T11:00:00Z';
    const alreadyReminded = threeRecipients.map((r) => ({
      ...r,
      reminder_sent_at: lastReminder,
    }));

    fromResults = [
      { data: [surveyRow], error: null, table: 'surveys' },
      { data: deploymentRow, error: null, table: 'deployments' },
      { data: orgRow, error: null, table: 'organizations' },
      { data: [templateRow], error: null, table: 'email_templates' },
      { data: alreadyReminded, error: null, table: 'survey_recipients' },
    ];
    const sent: Array<{ to: string; subject: string; html: string }> = [];

    const result = await sendReminders(makeClient(), baseInput, {
      send: mkSend(sent),
      batchDelayMs: 0,
    });

    expect(result.surveysProcessed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.totalSent).toBe(0);
    expect(sent).toHaveLength(0);
    // No update / log insert — only the 5 select-style queries.
    expect(fromCallTables).toEqual([
      'surveys',
      'deployments',
      'organizations',
      'email_templates',
      'survey_recipients',
    ]);
  });
});
