/**
 * Tests for generateReport orchestration.
 *
 * Covers the A.1 cross-org security fix plus the preserved baseline:
 *   - Same-org `client_exec` → 200 (report URL returned)
 *   - Cross-org `client_exec` → 403 FORBIDDEN, storage + renderer NOT called
 *   - `ccc_admin` / `ccc_member` targeting any org → 200 (staff bypass)
 *   - Report not found → 404
 *   - Renderer throws → 500 GENERATION_FAILED (envelope preserved)
 *   - `org_members` lookup returns null (non-staff caller with no org) → 403
 *
 * Supabase mock: scripted per-call fixtures matching the sequence of
 * `from()` chain terminators. Storage ops are stubbed via `client.storage`.
 * The render function is injected via `opts.renderer` so we never pull in
 * the real HTML/DOCX/PPTX renderers in tests.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim so ../_shared/cors.ts (imported transitively) works cleanly.
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import { generateReport, type RenderFn } from './handler.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
  count?: number;
}

let fromResults: MockResult[] = [];
let fromIndex = 0;

/** Track storage calls so tests can assert non-invocation on denial paths. */
let uploadCalls: number = 0;
let signedUrlCalls: number = 0;

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
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _buf: Uint8Array, _opts: unknown) => {
          uploadCalls++;
          return { data: null, error: null };
        },
        createSignedUrl: async (_path: string, _expires: number) => {
          signedUrlCalls++;
          return {
            data: { signedUrl: 'https://storage.test/signed-url' },
            error: null,
          };
        },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
  uploadCalls = 0;
  signedUrlCalls = 0;
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const REPORT_ORG = 'org-alpha';
const OTHER_ORG = 'org-beta';
const REPORT_ID = 'report-1';
const SURVEY_ID = 'survey-1';

const reportRow = {
  id: REPORT_ID,
  survey_id: SURVEY_ID,
  organization_id: REPORT_ORG,
  title: 'Q1 Report',
  format: 'pdf',
  status: 'queued',
  storage_path: null,
  sections: null,
  client_visible: false,
  triggered_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const surveyRow = {
  id: SURVEY_ID,
  title: 'Q1',
  scores_calculated: true,
  closes_at: '2026-05-01',
  archetype: 'Collaborator',
  archetype_description: 'desc',
  settings: { likertSize: 5 },
  organizations: {
    name: 'Acme',
    branding: { logo_url: null },
    settings: {},
  },
};

/**
 * Non-staff (`client_exec`) happy-path fixture sequence:
 *   [0] reports (loadReport)
 *   [1] org_members (cross-org gate)
 *   [2] reports update (mark generating)
 *   [3] surveys (assembleReportPayload)
 *   [4] scores
 *   [5] safe_segment_scores
 *   [6] recommendations
 *   [7] responses count
 *   [8] reports update (mark completed)
 */
function happyPathClientExecFixtures(opts: { membershipOrg?: string } = {}): MockResult[] {
  return [
    { data: reportRow, error: null },
    { data: { organization_id: opts.membershipOrg ?? REPORT_ORG }, error: null },
    { data: null, error: null }, // update generating
    { data: surveyRow, error: null },
    { data: [], error: null }, // scores
    { data: [], error: null }, // safe_segment_scores
    { data: [], error: null }, // recommendations
    { data: null, error: null, count: 0 }, // responses
    { data: null, error: null }, // update completed
  ];
}

/**
 * Staff (`ccc_admin` / `ccc_member` / `service_role`) fixture sequence:
 *   [0] reports (loadReport)
 *   [1] reports update (mark generating) — no org_members lookup
 *   [2] surveys
 *   [3] scores
 *   [4] safe_segment_scores
 *   [5] recommendations
 *   [6] responses count
 *   [7] reports update (mark completed)
 */
function happyPathStaffFixtures(): MockResult[] {
  return [
    { data: reportRow, error: null },
    { data: null, error: null }, // update generating
    { data: surveyRow, error: null },
    { data: [], error: null }, // scores
    { data: [], error: null }, // safe_segment_scores
    { data: [], error: null }, // recommendations
    { data: null, error: null, count: 0 }, // responses
    { data: null, error: null }, // update completed
  ];
}

const okRenderer: RenderFn = async () => ({
  buffer: new Uint8Array([1, 2, 3]),
  contentType: 'text/html',
  extension: '.html',
});

// ─── Cross-org enforcement (A.1 core) ───────────────────────────────────────

describe('generateReport — cross-org enforcement', () => {
  test('same-org client_exec → 200 with signed URL', async () => {
    fromResults = happyPathClientExecFixtures();

    let rendered = 0;
    const renderer: RenderFn = async (...args) => {
      rendered++;
      return okRenderer(...args);
    };

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'user-1', role: 'client_exec' } },
      { renderer },
    );

    expect(result.status).toBe(200);
    // Body is a success envelope on 200.
    const body = result.body as {
      reportId: string;
      status: string;
      signedUrl: string;
      generatedBy: string;
    };
    expect(body.reportId).toBe(REPORT_ID);
    expect(body.status).toBe('completed');
    expect(body.signedUrl).toBe('https://storage.test/signed-url');
    expect(body.generatedBy).toBe('user-1');
    expect(rendered).toBe(1);
    expect(uploadCalls).toBe(1);
    expect(signedUrlCalls).toBe(1);
  });

  test('cross-org client_exec → 403 FORBIDDEN, storage + renderer NOT called', async () => {
    // Caller is a member of OTHER_ORG, report belongs to REPORT_ORG → mismatch.
    fromResults = [
      { data: reportRow, error: null },
      { data: { organization_id: OTHER_ORG }, error: null },
    ];

    let rendered = 0;
    const renderer: RenderFn = async (...args) => {
      rendered++;
      return okRenderer(...args);
    };

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'attacker', role: 'client_exec' } },
      { renderer },
    );

    expect(result.status).toBe(403);
    const body = result.body as { error: string; message: string };
    expect(body.error).toBe('FORBIDDEN');
    expect(body.message).toMatch(/not a member/i);

    // Critical: no side effects on denial.
    expect(rendered).toBe(0);
    expect(uploadCalls).toBe(0);
    expect(signedUrlCalls).toBe(0);
  });

  test('caller has no org_members row at all → 403 FORBIDDEN', async () => {
    // membership lookup returns null — treat as non-member.
    fromResults = [
      { data: reportRow, error: null },
      { data: null, error: null },
    ];

    let rendered = 0;
    const renderer: RenderFn = async (...args) => {
      rendered++;
      return okRenderer(...args);
    };

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'ghost', role: 'client_exec' } },
      { renderer },
    );

    expect(result.status).toBe(403);
    const body = result.body as { error: string };
    expect(body.error).toBe('FORBIDDEN');
    expect(rendered).toBe(0);
    expect(uploadCalls).toBe(0);
  });

  test('ccc_admin targeting any org → 200 (staff bypass, no org_members lookup)', async () => {
    fromResults = happyPathStaffFixtures();

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'admin-1', role: 'ccc_admin' } },
      { renderer: okRenderer },
    );

    expect(result.status).toBe(200);
    const body = result.body as { generatedBy: string };
    expect(body.generatedBy).toBe('admin-1');
    // Staff path: only 8 fromIndex increments (no org_members lookup).
    expect(fromIndex).toBe(8);
  });

  test('ccc_member targeting any org → 200 (staff bypass)', async () => {
    fromResults = happyPathStaffFixtures();

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'member-1', role: 'ccc_member' } },
      { renderer: okRenderer },
    );

    expect(result.status).toBe(200);
    expect(fromIndex).toBe(8);
  });

  test('service_role → 200 (staff bypass)', async () => {
    // Internal callers (e.g. queue workers) authorize with the service-role key
    // which auth.ts resolves to role='service_role'. Must also bypass the gate.
    fromResults = happyPathStaffFixtures();

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'service_role', role: 'service_role' } },
      { renderer: okRenderer },
    );

    expect(result.status).toBe(200);
  });
});

// ─── Existing-behavior regressions ──────────────────────────────────────────

describe('generateReport — baseline behavior preserved', () => {
  test('report not found → 404 NOT_FOUND', async () => {
    // loadReport returns null when the row is missing (PGRST116 handled in db.ts).
    fromResults = [{ data: null, error: { code: 'PGRST116', message: 'no rows' } }];

    const result = await generateReport(
      makeClient(),
      { reportId: 'missing', caller: { userId: 'u', role: 'ccc_admin' } },
      { renderer: okRenderer },
    );

    expect(result.status).toBe(404);
    const body = result.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  test('renderer throws → 500 GENERATION_FAILED envelope', async () => {
    fromResults = [
      ...happyPathStaffFixtures().slice(0, 7), // up through responses count
      { data: null, error: null }, // update to 'failed' in the catch block
    ];

    const renderer: RenderFn = async () => {
      throw new Error('docx render kaboom');
    };

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'admin-1', role: 'ccc_admin' } },
      { renderer },
    );

    expect(result.status).toBe(500);
    const body = result.body as { error: string; message: string };
    expect(body.error).toBe('GENERATION_FAILED');
    expect(body.message).toContain('docx render kaboom');
    // Renderer threw before upload — storage never called.
    expect(uploadCalls).toBe(0);
    expect(signedUrlCalls).toBe(0);
  });

  test('report already completed → 409 INVALID_STATE', async () => {
    fromResults = [
      { data: { ...reportRow, status: 'completed' }, error: null },
    ];

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'admin-1', role: 'ccc_admin' } },
      { renderer: okRenderer },
    );

    expect(result.status).toBe(409);
    const body = result.body as { error: string };
    expect(body.error).toBe('INVALID_STATE');
  });

  test('passes selected report sections to the renderer', async () => {
    fromResults = [
      {
        data: {
          ...reportRow,
          sections: ['cover', 'recommendations'],
        },
        error: null,
      },
      ...happyPathStaffFixtures().slice(1),
    ];

    let renderedSections: Array<{ id: string; included: boolean }> | undefined;
    const renderer: RenderFn = async (payload) => {
      renderedSections = payload.sections;
      return {
        buffer: new Uint8Array([1, 2, 3]),
        contentType: 'text/html',
        extension: '.html',
      };
    };

    const result = await generateReport(
      makeClient(),
      { reportId: REPORT_ID, caller: { userId: 'admin-1', role: 'ccc_admin' } },
      { renderer },
    );

    expect(result.status).toBe(200);
    expect(renderedSections).toBeDefined();
    expect(renderedSections?.find((section) => section.id === 'cover')?.included).toBe(true);
    expect(renderedSections?.find((section) => section.id === 'executive_summary')?.included).toBe(false);
    expect(renderedSections?.find((section) => section.id === 'recommendations')?.included).toBe(true);
  });
});
