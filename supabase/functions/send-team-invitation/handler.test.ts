/**
 * Tests for sendTeamInvitation orchestration.
 *
 * Covers:
 *   - Happy path: pending invitation → send called, email_status → 'sent',
 *     sent_at stamped
 *   - Missing invitation → 404 INVITATION_NOT_FOUND
 *   - Expired invitation → 410 EXPIRED
 *   - Missing template (no org-specific, no default) → 500 CONFIG_ERROR;
 *     invitation row NOT updated
 *   - Send failure → 500 SEND_FAILED; invitation flipped to 'failed'
 *   - Malicious `javascript:` appUrl → sanitizeUrl falls back to fallback
 *     (fallback is the same `appUrl`, so the rendered body still has the
 *     escaped fallback but never the raw javascript: scheme)
 *   - org_context is populated from the organizations table when
 *     organization_id is present
 *
 * Supabase mock: scripted per-call fixtures matching the sequence of
 * `from()`, `.select()`, `.eq()`, `.single()/.then()`. Matches the pattern
 * already used by send-invitations/handler.test.ts.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim so the module imports cleanly under Bun
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import {
  functionInvokeErrorMessage,
  sendTeamInvitation,
  type SendFn,
  type SendEmailArgs,
} from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
  count?: number;
}

let fromResults: MockResult[] = [];
let fromIndex = 0;
let fromTables: string[] = [];

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
    from: (table: string) => {
      const idx = fromIndex++;
      fromTables.push(table);
      return makeChain(idx);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
  fromTables = [];
});

describe('functionInvokeErrorMessage', () => {
  test('prefers downstream JSON message over generic client error', async () => {
    const message = await functionInvokeErrorMessage(
      new Error('Edge Function returned a non-2xx status code'),
      new Response(
        JSON.stringify({
          error: 'SEND_FAILED',
          message: 'Resend 400: domain is not verified',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    expect(message).toBe('Resend 400: domain is not verified');
  });
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const now = new Date('2026-04-16T12:00:00Z');

const pendingInvitation = {
  id: 'inv-1',
  email: 'new.hire@example.com',
  role: 'client_director',
  organization_id: 'org-1',
  expires_at: '2026-05-01T00:00:00Z',
  email_status: 'pending',
  sent_at: null,
};

const orgRow = { name: 'Acme & Co.' };

const templateRow = {
  subject: 'You have been invited as {{role_label}}{{org_context}}',
  html_body:
    '<p>Welcome! Accept by <a href="{{accept_link}}">clicking here</a>. Expires {{expires_at}}.</p>',
};

// Happy-path fixture sequence:
//   [0] invitations select
//   [1] organizations select
//   [2] email_templates select
//   [3] invitations update (mark sent)
function happyPathFixtures(): MockResult[] {
  return [
    { data: pendingInvitation, error: null },
    { data: orgRow, error: null },
    { data: [templateRow], error: null },
    { data: null, error: null },
  ];
}

const appUrl = 'https://app.test';

function captureSend(): { calls: SendEmailArgs[]; send: SendFn } {
  const calls: SendEmailArgs[] = [];
  const send: SendFn = async (msg) => {
    calls.push(msg);
    return { id: 'email-log-123', error: null };
  };
  return { calls, send };
}

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('sendTeamInvitation — happy path', () => {
  test('valid pending invitation → send called, status 200, invitation marked sent', async () => {
    fromResults = happyPathFixtures();
    const { calls, send } = captureSend();

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.invitationId).toBe('inv-1');
    expect(result.body.emailLogId).toBe('email-log-123');

    // Send was invoked exactly once with the right payload
    expect(calls).toHaveLength(1);
    expect(calls[0].to).toBe('new.hire@example.com');
    expect(calls[0].templateType).toBe('team_invitation');

    // Subject renders role label + org context
    expect(calls[0].subject).toBe(
      'You have been invited as Client Director for Acme &amp; Co.',
    );

    // Rendered body contains a clean accept link back to our app
    expect(calls[0].html).toContain('https://app.test/auth/accept-invite?token=inv-1');
    // and the formatted expiry date (en-CA long format)
    expect(calls[0].html).toMatch(/May 1, 2026|April 30, 2026/); // TZ-safe match

    // Tables touched in order: invitations, organizations, email_templates, invitations (update)
    expect(fromTables).toEqual([
      'invitations',
      'organizations',
      'email_templates',
      'invitations',
    ]);
  });
});

// ─── Failure paths ──────────────────────────────────────────────────────────

describe('sendTeamInvitation — failure paths', () => {
  test('invitation missing → 404 INVITATION_NOT_FOUND, send NOT called', async () => {
    fromResults = [{ data: null, error: { message: 'not found', code: 'PGRST116' } }];
    const { calls, send } = captureSend();

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'missing' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('INVITATION_NOT_FOUND');
    expect(calls).toHaveLength(0);
    // No update to invitations — the row doesn't exist.
    expect(fromTables).toEqual(['invitations']);
  });

  test('expired invitation → 410 EXPIRED, send NOT called, invitation NOT updated', async () => {
    const expiredInv = { ...pendingInvitation, expires_at: '2026-01-01T00:00:00Z' };
    fromResults = [{ data: expiredInv, error: null }];
    const { calls, send } = captureSend();

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(410);
    expect(result.body.error).toBe('EXPIRED');
    expect(calls).toHaveLength(0);
    // Only the invitations SELECT — no update, no template lookup.
    expect(fromTables).toEqual(['invitations']);
  });

  test('template missing → 500 CONFIG_ERROR, send NOT called, invitation NOT updated', async () => {
    fromResults = [
      { data: pendingInvitation, error: null },
      { data: orgRow, error: null },
      { data: [], error: null }, // no templates
    ];
    const { calls, send } = captureSend();

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(500);
    expect(result.body.error).toBe('CONFIG_ERROR');
    expect(calls).toHaveLength(0);
    // No update to invitations — config failure is operator-level.
    expect(fromTables).toEqual(['invitations', 'organizations', 'email_templates']);
  });

  test('email send fails → 500 SEND_FAILED, invitation flipped to failed', async () => {
    fromResults = [
      { data: pendingInvitation, error: null },
      { data: orgRow, error: null },
      { data: [templateRow], error: null },
      { data: null, error: null }, // update (failed status)
    ];

    const send: SendFn = async () => ({ id: null, error: 'Resend 4xx: invalid recipient' });

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(500);
    expect(result.body.error).toBe('SEND_FAILED');
    expect(result.body.message).toBe('Resend 4xx: invalid recipient');

    // The invitation row was updated — to mark it failed, NOT to mark sent.
    expect(fromTables).toEqual([
      'invitations',
      'organizations',
      'email_templates',
      'invitations',
    ]);
  });

  test('invitation without organization_id skips org lookup', async () => {
    const globalInv = { ...pendingInvitation, organization_id: null };
    fromResults = [
      { data: globalInv, error: null },
      { data: [templateRow], error: null },
      { data: null, error: null },
    ];
    const { calls, send } = captureSend();

    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl, send, now },
    );

    expect(result.status).toBe(200);
    // Subject has empty org_context (no "for <org>")
    expect(calls[0].subject).toBe('You have been invited as Client Director');
    // Order: invitations, email_templates, invitations(update) — no organizations lookup
    expect(fromTables).toEqual(['invitations', 'email_templates', 'invitations']);
  });
});

// ─── Hardening: URL sanitization ────────────────────────────────────────────

describe('sendTeamInvitation — URL hardening', () => {
  test('malicious javascript: appUrl → rendered body falls back to the fallback', async () => {
    fromResults = happyPathFixtures();
    const { calls, send } = captureSend();

    // The raw accept link will start with `javascript:/auth/accept-invite?...`
    // which sanitizeUrl rejects. The fallback is `appUrl` itself, so the
    // rendered body contains the escaped fallback — NEVER the live script
    // scheme.
    const result = await sendTeamInvitation(
      makeClient(),
      { invitationId: 'inv-1' },
      { appUrl: 'javascript:alert(1)', send, now },
    );

    expect(result.status).toBe(200);
    // The rendered body MUST NOT contain an executable pseudo-scheme.
    expect(calls[0].html).not.toContain('javascript:alert');
    // And it MUST NOT contain an unescaped `javascript:` in the href.
    expect(calls[0].html).not.toMatch(/href="javascript:/i);
  });
});
