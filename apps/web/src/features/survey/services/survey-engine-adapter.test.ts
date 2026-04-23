import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for createSurveyEngineAdapter.resolveDeployment.
 *
 * Wave 1.2 pinned the status ordering: not_found → closed → expired →
 * not_yet_open → valid. Table-driven cases below walk the grid of
 * (surveyStatus, opens_at, closes_at, is_active, sessionCookie) to lock
 * in the ordering. Note: the adapter doesn't inspect the session cookie —
 * already_completed is resolved one layer up (SurveyLayoutInner). The
 * table includes the "completed" scenario for spec parity but asserts
 * that the adapter returns `valid` there, matching the real contract.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string };
}

let queryResult: MockResult = { data: null, error: null };
let sessionQueryResult: MockResult = { data: null, error: null };

/** Captured arguments for surveySessionClient() — one entry per call. */
const sessionClientCalls: string[] = [];

function makeChain(resultRef: () => MockResult): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.select = self;
  chain.eq = self;
  chain.single = (): Promise<MockResult> => Promise.resolve(resultRef());
  chain.maybeSingle = (): Promise<MockResult> => Promise.resolve(resultRef());
  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: { from: () => makeChain(() => queryResult) },
  surveySessionClient: (sessionToken: string) => {
    sessionClientCalls.push(sessionToken);
    return { from: () => makeChain(() => sessionQueryResult) };
  },
}));

mock.module('../../../lib/logger', () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

const { createSurveyEngineAdapter } = await import('./survey-engine-adapter.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 30 * 86_400_000).toISOString();
const PAST_FAR = new Date(NOW.getTime() - 120 * 86_400_000).toISOString();
const FUTURE = new Date(NOW.getTime() + 30 * 86_400_000).toISOString();
const FUTURE_FAR = new Date(NOW.getTime() + 180 * 86_400_000).toISOString();

interface TokenRow {
  deployment: {
    id: string;
    survey_id: string;
    token: string;
    type: string;
    settings: null;
    opens_at: string | null;
    closes_at: string | null;
    access_count: number;
    last_accessed_at: null;
    created_at: string;
    is_active: boolean;
  };
  survey: {
    id: string;
    organization_id: string;
    title: string;
    description: null;
    status: 'active' | 'closed' | 'archived' | 'draft';
    opens_at: string | null;
    closes_at: string | null;
    settings: null;
    scores_calculated: boolean;
    scores_calculated_at: null;
    created_at: string;
    updated_at: string;
    created_by: null;
  } | null;
}

function makeRow(row: TokenRow): unknown {
  return { ...row.deployment, survey: row.survey };
}

function baseDeployment(overrides: Partial<TokenRow['deployment']> = {}): TokenRow['deployment'] {
  return {
    id: 'd1',
    survey_id: 's1',
    token: 'tok',
    type: 'anonymous_link',
    settings: null,
    opens_at: null,
    closes_at: null,
    access_count: 0,
    last_accessed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    is_active: true,
    ...overrides,
  };
}

function baseSurvey(
  overrides: Partial<NonNullable<TokenRow['survey']>> = {},
): NonNullable<TokenRow['survey']> {
  return {
    id: 's1',
    organization_id: 'org-1',
    title: 'Test Survey',
    description: null,
    status: 'active',
    opens_at: null,
    closes_at: null,
    settings: null,
    scores_calculated: false,
    scores_calculated_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: null,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const adapter = createSurveyEngineAdapter();

describe('resolveDeployment — status ordering grid', () => {
  beforeEach(() => {
    queryResult = { data: null, error: null };
  });

  test('no row → not_found', async () => {
    queryResult = { data: null, error: { message: 'not found' } };
    const result = await adapter.resolveDeployment('missing');
    expect(result.status).toBe('not_found');
  });

  test('deployment with null survey → not_found (orphaned deployment)', async () => {
    queryResult = {
      data: makeRow({ deployment: baseDeployment(), survey: null }),
      error: null,
    };
    const result = await adapter.resolveDeployment('orphan');
    expect(result.status).toBe('not_found');
  });

  test('(active, past, future, true) + no cookie → valid', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({ opens_at: PAST, closes_at: FUTURE }),
        survey: baseSurvey({ status: 'active' }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('valid');
  });

  test('(active, future, future, true) + no cookie → not_yet_open (opensAt preserved)', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({ opens_at: FUTURE, closes_at: FUTURE_FAR }),
        survey: baseSurvey({ status: 'active' }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('not_yet_open');
    if (result.status === 'not_yet_open') {
      expect(result.opensAt).toBe(FUTURE);
    }
  });

  test('(active, past, past, true) + no cookie → expired', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({ opens_at: PAST_FAR, closes_at: PAST }),
        survey: baseSurvey({ status: 'active' }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('expired');
  });

  test('(closed, past, past, false) + no cookie → closed (closesAt preserved)', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({
          opens_at: PAST_FAR,
          closes_at: PAST,
          is_active: false,
        }),
        survey: baseSurvey({ status: 'closed', closes_at: PAST }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('closed');
    if (result.status === 'closed') {
      expect(result.closesAt).toBe(PAST);
    }
  });

  test('(closed, future, future, true) + no cookie → closed, NOT not_yet_open', async () => {
    // Regression guard: a closed survey whose deployment still has a future
    // window must resolve to `closed`, not `not_yet_open`. Ordering matters.
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({
          opens_at: FUTURE,
          closes_at: FUTURE_FAR,
          is_active: true,
        }),
        survey: baseSurvey({ status: 'closed', closes_at: FUTURE_FAR }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('closed');
  });

  test('(archived, past, past, false) + no cookie → closed', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({
          opens_at: PAST_FAR,
          closes_at: PAST,
          is_active: false,
        }),
        survey: baseSurvey({ status: 'archived', closes_at: PAST }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('closed');
  });

  test('(active, past, future, true) + completed cookie → valid (cookie handled upstream)', async () => {
    // The adapter does not read cookies; already_completed is resolved by
    // SurveyLayoutInner after the adapter returns `valid`. This row pins
    // the contract: the adapter itself must NOT return already_completed.
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({ opens_at: PAST, closes_at: FUTURE }),
        survey: baseSurvey({ status: 'active' }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('valid');
    expect(result.status).not.toBe('already_completed');
  });

  test('closed survey with null closes_at on both deployment and survey → closed with closesAt=null', async () => {
    queryResult = {
      data: makeRow({
        deployment: baseDeployment({ closes_at: null }),
        survey: baseSurvey({ status: 'closed', closes_at: null }),
      }),
      error: null,
    };
    const result = await adapter.resolveDeployment('t');
    expect(result.status).toBe('closed');
    if (result.status === 'closed') {
      expect(result.closesAt).toBeNull();
    }
  });
});

describe('resumeResponse — session-token binding', () => {
  // Regression: migration 39 requires anon SELECT on responses/answers to
  // carry an `x-session-token` header. resumeResponse must build a session-
  // scoped client via surveySessionClient() rather than using the module-
  // level anon client, otherwise RLS returns zero rows and resume silently
  // fails.

  beforeEach(() => {
    queryResult = { data: null, error: null };
    sessionQueryResult = { data: null, error: null };
    sessionClientCalls.length = 0;
  });

  test('resume with no matching response returns null', async () => {
    sessionQueryResult = { data: null, error: null };
    const result = await adapter.resumeResponse('deployment-1', 'session-token-1');
    expect(result).toBeNull();
    // Contract: the adapter must scope the query to the given session token.
    expect(sessionClientCalls).toEqual(['session-token-1']);
  });

  test('resume with matching response returns mapped SurveyResponse', async () => {
    sessionQueryResult = {
      data: {
        id: 'resp-1',
        deployment_id: 'deployment-1',
        session_token: 'session-token-1',
        is_complete: false,
        submitted_at: null,
        metadata_department: null,
        metadata_role: null,
        metadata_location: null,
        metadata_tenure: null,
        user_agent: null,
        created_at: '2026-04-22T00:00:00Z',
        updated_at: '2026-04-22T00:00:00Z',
        answers: [{ question_id: 'q-1', likert_value: 3, open_text_value: null }],
      },
      error: null,
    };
    const result = await adapter.resumeResponse('deployment-1', 'session-token-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('resp-1');
    expect(result?.deploymentId).toBe('deployment-1');
    expect(result?.answers['q-1']).toBe(3);
    // Confirm the session-scoped client was used (sends x-session-token).
    expect(sessionClientCalls).toEqual(['session-token-1']);
  });

  test('resume with DB error returns null (fail-closed)', async () => {
    sessionQueryResult = { data: null, error: { message: 'rls denied' } };
    const result = await adapter.resumeResponse('deployment-1', 'session-token-1');
    expect(result).toBeNull();
    expect(sessionClientCalls).toEqual(['session-token-1']);
  });

  test('resume never uses the module-level supabase client', async () => {
    // If the adapter regresses to using `supabase` (no header), it would
    // read from queryResult. Set a decoy row there that, if read, would
    // obviously leak: different deployment id. Assert the adapter ignored it.
    queryResult = {
      data: {
        id: 'decoy-resp',
        deployment_id: 'WRONG',
        session_token: 'session-token-1',
        is_complete: false,
        submitted_at: null,
        metadata_department: null,
        metadata_role: null,
        metadata_location: null,
        metadata_tenure: null,
        user_agent: null,
        created_at: '2026-04-22T00:00:00Z',
        updated_at: '2026-04-22T00:00:00Z',
        answers: [],
      },
      error: null,
    };
    sessionQueryResult = { data: null, error: null };

    const result = await adapter.resumeResponse('deployment-1', 'session-token-1');
    expect(result).toBeNull();
    // Confirms the adapter went through the session client, not the module client.
    expect(sessionClientCalls).toEqual(['session-token-1']);
  });
});
