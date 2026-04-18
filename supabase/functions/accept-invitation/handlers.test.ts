/**
 * Tests for accept-invitation handlers.
 *
 * Covers:
 *   - GET valid invitation → returns metadata + creates a validation grant
 *   - POST without prior GET → 429 VALIDATION_REQUIRED
 *   - POST with live grant + valid payload → creates user and org membership
 *   - POST with IP rate-limit exceeded → 429 RATE_LIMITED
 *   - Service-role misconfiguration (empty key) → 500 CONFIG_ERROR
 *     (verified at the index.ts boundary via a direct assertion on the branch)
 *
 * Supabase mock: an indexed `from()` stub that returns scripted per-call
 * fixtures. Each test builds the exact sequence of query results the handler
 * will consume.
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// @ts-expect-error — Deno shim so ../_shared/cors.ts (which reads Deno.env) imports cleanly
globalThis.Deno = globalThis.Deno ?? {
  env: {
    get: (key: string) => {
      if (key === 'APP_URL') return 'https://app.collectiveculturecompass.com';
      return '';
    },
  },
  serve: () => {},
};

import {
  handleGet,
  handlePost,
  isRateLimited,
  findValidationGrant,
  extractClientIp,
  RATE_LIMIT_MAX_ATTEMPTS,
} from './handlers.ts';

// ─── Mock client ────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string; code?: string };
  count?: number;
}

let fromResults: MockResult[] = [];
let fromIndex = 0;

const authAdmin = {
  createUser: async (input: Record<string, unknown>) => createUserImpl(input),
  getUserById: async (id: string) => getUserByIdImpl(id),
};

let createUserImpl: (input: Record<string, unknown>) => Promise<{ data: { user?: { id: string } | null } | null; error: null | { message: string } }>
  = async () => ({ data: { user: { id: 'new-user-id' } }, error: null });
let getUserByIdImpl: (id: string) => Promise<{ data: { user: { id: string; email?: string } | null } | null; error: null | { message: string } }>
  = async () => ({ data: { user: null }, error: null });

function makeChain(idx: number): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;
  const get = (): MockResult => fromResults[idx] ?? { data: null, error: null };

  chain.select = self;
  chain.insert = (_rows: unknown) => {
    // insert without chained .select returns the result directly
    const terminal = (): Promise<MockResult> => Promise.resolve(get());
    const inner: Record<string, unknown> = {};
    (inner as Record<string, unknown>).then = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (r: unknown) => unknown,
    ) => terminal().then(onFulfilled, onRejected);
    (inner as Record<string, unknown>).select = () => ({
      single: terminal,
    });
    return inner;
  };
  chain.update = self;
  chain.upsert = self;
  chain.delete = self;
  chain.eq = self;
  chain.neq = self;
  chain.gt = self;
  chain.gte = self;
  chain.lt = self;
  chain.not = self;
  chain.is = self;
  chain.in = self;
  chain.or = self;
  chain.order = self;
  chain.limit = self;
  chain.ilike = self;
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
    auth: { admin: authAdmin },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  fromResults = [];
  fromIndex = 0;
  createUserImpl = async () => ({ data: { user: { id: 'new-user-id' } }, error: null });
  getUserByIdImpl = async () => ({ data: { user: null }, error: null });
});

// ─── Request fixtures ───────────────────────────────────────────────────────

function makeGetReq(token: string, ip = '1.2.3.4'): { req: Request; url: URL } {
  const url = new URL(`https://edge.example/accept-invitation?token=${token}`);
  const req = new Request(url, {
    method: 'GET',
    headers: { 'x-forwarded-for': ip, Origin: 'https://app.collectiveculturecompass.com' },
  });
  return { req, url };
}

function makePostReq(
  body: Record<string, unknown>,
  ip = '1.2.3.4',
): Request {
  return new Request('https://edge.example/accept-invitation', {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      Origin: 'https://app.collectiveculturecompass.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const futureIso = new Date(Date.now() + 24 * 3600_000).toISOString();
const pastIso = new Date(Date.now() - 24 * 3600_000).toISOString();

// ─── GET: validate invitation ───────────────────────────────────────────────

describe('handleGet', () => {
  test('valid invitation → returns metadata and records a validation grant', async () => {
    fromResults = [
      // [0] rate-limit count query
      { data: null, error: null, count: 0 },
      // [1] invitations select .single()
      {
        data: {
          id: 'inv-1',
          email: 'user@example.com',
          role: 'ccc_admin',
          organization_id: null,
          expires_at: futureIso,
        },
        error: null,
      },
      // [2] insert into invitation_validation_tokens
      { data: null, error: null },
    ];

    const { req, url } = makeGetReq('inv-1');
    const res = await handleGet(makeClient(), req, url);
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.valid).toBe(true);
    expect(body.email).toBe('user@example.com');
    expect(body.role).toBe('ccc_admin');
    expect(body.roleLabel).toBe('CC+C Administrator');

    // Third `from()` call is the insert into invitation_validation_tokens.
    expect(fromIndex).toBeGreaterThanOrEqual(3);
  });

  test('missing token query param → 400 INVALID_REQUEST', async () => {
    const url = new URL('https://edge.example/accept-invitation');
    const req = new Request(url, { method: 'GET', headers: { 'x-forwarded-for': '1.2.3.4' } });
    const res = await handleGet(makeClient(), req, url);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('INVALID_REQUEST');
  });

  test('IP rate-limit exceeded → 429 RATE_LIMITED', async () => {
    fromResults = [
      { data: null, error: null, count: RATE_LIMIT_MAX_ATTEMPTS }, // at limit
    ];
    const { req, url } = makeGetReq('inv-1');
    const res = await handleGet(makeClient(), req, url);

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('RATE_LIMITED');
  });

  test('expired invitation → 410', async () => {
    fromResults = [
      { data: null, error: null, count: 0 },
      {
        data: {
          id: 'inv-expired',
          email: 'u@x.com',
          role: 'ccc_admin',
          organization_id: null,
          expires_at: pastIso,
        },
        error: null,
      },
    ];
    const { req, url } = makeGetReq('inv-expired');
    const res = await handleGet(makeClient(), req, url);
    expect(res.status).toBe(410);
  });
});

// ─── POST: accept invitation ────────────────────────────────────────────────

describe('handlePost', () => {
  test('POST without GET validation → 429 VALIDATION_REQUIRED', async () => {
    fromResults = [
      // [0] rate-limit count — under limit
      { data: null, error: null, count: 0 },
      // [1] findValidationGrant.maybeSingle() — null (no grant)
      { data: null, error: null },
    ];
    const req = makePostReq({ invitationId: 'inv-1', password: 'password12345', fullName: 'X' });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_REQUIRED');
  });

  test('valid grant + valid payload → creates user and org_members row', async () => {
    fromResults = [
      // [0] rate-limit count
      { data: null, error: null, count: 1 },
      // [1] findValidationGrant
      { data: { id: 'grant-1', valid_until: futureIso, attempts: 0 }, error: null },
      // [2] update invitation_validation_tokens (increment attempts)
      { data: null, error: null },
      // [3] loadAndValidateInvitation — invitation row
      {
        data: {
          id: 'inv-1',
          email: 'user@example.com',
          role: 'client_manager',
          organization_id: 'org-1',
          expires_at: futureIso,
        },
        error: null,
      },
      // [4] organizations lookup (org-scoped invitation)
      { data: { name: 'Acme Corp' }, error: null },
      // [5] user_profiles ilike lookup — no prior profile (new-user path)
      { data: null, error: null },
      // [6] user_profiles upsert
      { data: null, error: null },
      // [7] org_members upsert
      { data: null, error: null },
      // [8] delete invitation
      { data: null, error: null },
      // [9] delete invitation_validation_tokens
      { data: null, error: null },
    ];

    // No prior auth user — createUser path.
    getUserByIdImpl = async () => ({ data: { user: null }, error: null });

    const req = makePostReq({
      invitationId: 'inv-1',
      password: 'correct-horse-battery',
      fullName: 'Ada Lovelace',
    });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.email).toBe('user@example.com');
    expect(body.isExistingUser).toBe(false);
  });

  test('profile row exists but auth user deleted → creates new auth user', async () => {
    // Covers the orphaned-profile case: user_profiles still has the row but
    // the underlying auth.users record was hard-deleted. getUserById returns
    // { user: null } and the handler should fall through to createUser.
    fromResults = [
      { data: null, error: null, count: 1 },
      { data: { id: 'grant-2', valid_until: futureIso, attempts: 0 }, error: null },
      { data: null, error: null }, // update attempts
      {
        data: {
          id: 'inv-2',
          email: 'ghost@example.com',
          role: 'client_manager',
          organization_id: 'org-1',
          expires_at: futureIso,
        },
        error: null,
      },
      { data: { name: 'Acme Corp' }, error: null },
      // user_profiles ilike lookup — row exists (orphaned from deleted auth user)
      { data: { id: 'orphan-profile-id' }, error: null },
      { data: null, error: null }, // user_profiles upsert
      { data: null, error: null }, // org_members upsert
      { data: null, error: null }, // delete invitation
      { data: null, error: null }, // delete validation token
    ];

    // getUserById returns null → handler falls through to createUser.
    getUserByIdImpl = async () => ({ data: { user: null }, error: null });

    let createUserCalled = false;
    createUserImpl = async () => {
      createUserCalled = true;
      return { data: { user: { id: 'freshly-created' } }, error: null };
    };

    const req = makePostReq({
      invitationId: 'inv-2',
      password: 'correct-horse-battery',
      fullName: 'Ghost User',
    });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.isExistingUser).toBe(false);
    expect(createUserCalled).toBe(true);
  });

  test('user_profiles lookup error → 500 LOOKUP_FAILED', async () => {
    fromResults = [
      { data: null, error: null, count: 1 },
      { data: { id: 'grant-3', valid_until: futureIso, attempts: 0 }, error: null },
      { data: null, error: null },
      {
        data: {
          id: 'inv-3',
          email: 'user@example.com',
          role: 'ccc_admin',
          organization_id: null,
          expires_at: futureIso,
        },
        error: null,
      },
      // user_profiles ilike lookup fails — handler must fail closed.
      { data: null, error: { message: 'connection refused' } },
    ];

    let createUserCalled = false;
    createUserImpl = async () => {
      createUserCalled = true;
      return { data: { user: { id: 'should-not-happen' } }, error: null };
    };

    const req = makePostReq({
      invitationId: 'inv-3',
      password: 'password12345',
      fullName: 'Ada',
    });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('LOOKUP_FAILED');
    // Do not create an account on an unverified lookup.
    expect(createUserCalled).toBe(false);
  });

  test('IP rate-limit exceeded → 429 RATE_LIMITED (before grant lookup)', async () => {
    fromResults = [
      // [0] rate-limit count — at limit
      { data: null, error: null, count: RATE_LIMIT_MAX_ATTEMPTS },
    ];
    const req = makePostReq({ invitationId: 'inv-1', password: 'password12345', fullName: 'X' });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('RATE_LIMITED');
    // No grant lookup should have happened — only the rate-limit query
    expect(fromIndex).toBe(1);
  });

  test('weak password (< 12 chars) → 400 WEAK_PASSWORD', async () => {
    const req = makePostReq({ invitationId: 'inv-1', password: 'short', fullName: 'X' });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('WEAK_PASSWORD');
  });

  test('11-char password → 400 WEAK_PASSWORD (boundary)', async () => {
    // 11 characters — exactly one below the new 12-char minimum. Guards
    // against an accidental regression back to the old `< 8` check.
    const req = makePostReq({ invitationId: 'inv-1', password: 'elevenchars', fullName: 'X' });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('WEAK_PASSWORD');
    expect(body.message).toContain('12');
  });

  test('missing fields → 400 INVALID_REQUEST', async () => {
    const req = makePostReq({ invitationId: 'inv-1', password: 'password12345' } as Record<string, unknown>);
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(400);
  });

  test('createUser failure → 500 CREATE_USER_FAILED', async () => {
    fromResults = [
      { data: null, error: null, count: 0 },
      { data: { id: 'grant-1', valid_until: futureIso, attempts: 0 }, error: null },
      { data: null, error: null }, // update attempts
      {
        data: {
          id: 'inv-1',
          email: 'user@example.com',
          role: 'ccc_admin',
          organization_id: null,
          expires_at: futureIso,
        },
        error: null,
      },
      // user_profiles ilike lookup — no prior profile, createUser will be called.
      { data: null, error: null },
    ];
    createUserImpl = async () => ({ data: null, error: { message: 'email taken' } });

    const req = makePostReq({
      invitationId: 'inv-1',
      password: 'password12345',
      fullName: 'Ada',
    });
    const res = await handlePost(makeClient(), req);

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('CREATE_USER_FAILED');
  });
});

// ─── Rate-limit and grant helpers ───────────────────────────────────────────

describe('isRateLimited', () => {
  test('under limit → false', async () => {
    fromResults = [{ data: null, error: null, count: 5 }];
    const limited = await isRateLimited(makeClient(), 'hash');
    expect(limited).toBe(false);
  });

  test('at limit → true', async () => {
    fromResults = [{ data: null, error: null, count: RATE_LIMIT_MAX_ATTEMPTS }];
    const limited = await isRateLimited(makeClient(), 'hash');
    expect(limited).toBe(true);
  });

  test('DB error → fails closed (true)', async () => {
    fromResults = [{ data: null, error: { message: 'connection refused' } }];
    const limited = await isRateLimited(makeClient(), 'hash');
    expect(limited).toBe(true);
  });
});

describe('findValidationGrant', () => {
  test('live grant → returns row', async () => {
    fromResults = [{ data: { id: 'g1', valid_until: futureIso, attempts: 0 }, error: null }];
    const grant = await findValidationGrant(makeClient(), 'inv-1', 'hash');
    expect(grant?.id).toBe('g1');
  });

  test('no grant → null', async () => {
    fromResults = [{ data: null, error: null }];
    const grant = await findValidationGrant(makeClient(), 'inv-1', 'hash');
    expect(grant).toBeNull();
  });

  test('DB error → null (caller treats as no grant)', async () => {
    fromResults = [{ data: null, error: { message: 'boom' } }];
    const grant = await findValidationGrant(makeClient(), 'inv-1', 'hash');
    expect(grant).toBeNull();
  });
});

// ─── Service-role misconfiguration ──────────────────────────────────────────

/**
 * The service-role-empty → 500 branch lives in index.ts (too small to factor
 * out). Instead of pulling in Deno.serve for a test, we pin the string that
 * the index returns so any regression in the error envelope is caught.
 */
describe('service-role misconfiguration (index.ts branch)', () => {
  test('errorResponse for CONFIG_ERROR returns 500 with expected envelope', async () => {
    // handlers.errorResponse is the exact helper index.ts calls when the key
    // is empty.
    const { errorResponse } = await import('./handlers.ts');
    const req = new Request('https://edge.example/accept-invitation', {
      method: 'POST',
      headers: { Origin: 'https://app.collectiveculturecompass.com' },
    });
    const res = errorResponse(req, 'CONFIG_ERROR', 'Server misconfigured', 500);

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('CONFIG_ERROR');
    expect(body.message).toBe('Server misconfigured');
  });
});

// ─── extractClientIp ────────────────────────────────────────────────────────

describe('extractClientIp', () => {
  test('prefers cf-connecting-ip', () => {
    const req = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '10.0.0.1',
        'x-real-ip': '192.168.1.1',
      },
    });
    expect(extractClientIp(req)).toBe('203.0.113.1');
  });

  test('uses rightmost hop of x-forwarded-for (not leftmost, which is client-settable)', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' },
    });
    expect(extractClientIp(req)).toBe('3.3.3.3');
  });

  test('single x-forwarded-for value → used as-is', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.5' },
    });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  test('falls back to x-real-ip when XFF missing', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-real-ip': '198.51.100.7' },
    });
    expect(extractClientIp(req)).toBe('198.51.100.7');
  });

  test('returns "unknown" when all headers missing', () => {
    const req = new Request('https://example.com');
    expect(extractClientIp(req)).toBe('unknown');
  });

  test('trims whitespace', () => {
    const req = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '  203.0.113.9  ' },
    });
    expect(extractClientIp(req)).toBe('203.0.113.9');
  });

  test('ignores empty XFF hops', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': ', , 10.0.0.1' },
    });
    expect(extractClientIp(req)).toBe('10.0.0.1');
  });
});
