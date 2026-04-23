import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for the admin user service — covers team-member listing,
 * invitation listing, invitation creation (with edge-function invocation),
 * and role updates. Pays special attention to the Wave 2.D nullable
 * fullName (TeamMember.fullName: string | null).
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastUpdate: unknown = null;
let invokeCalls: Array<{ fn: string; body: unknown }> = [];

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.insert = (payload: unknown) => {
    (chain as Record<string, unknown>).__insertPayload = payload;
    return chain;
  };
  chain.update = (payload: unknown) => {
    lastUpdate = payload;
    return chain;
  };
  chain.delete = self;
  chain.eq = self;
  chain.in = self;
  chain.is = self;
  chain.contains = self;
  chain.order = self;
  chain.single = () => Promise.resolve(nextResult);

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(nextResult).then(onFulfilled, onRejected);

  return chain;
}

mock.module('../../../../lib/supabase', () => ({
  surveySessionClient: () => ({ from: () => ({}) }),
  supabase: {
    from: () => makeChain(),
    functions: {
      invoke: (fn: string, opts: { body: unknown }) => {
        invokeCalls.push({ fn, body: opts.body });
        return Promise.resolve({ data: null, error: null });
      },
    },
  },
}));

const {
  listTeamMembers,
  listInvitations,
  createInvitation,
  revokeInvitation,
  updateUserRole,
} = await import('./user-service.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('listTeamMembers', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    invokeCalls = [];
    lastUpdate = null;
  });

  test('returns an empty array when no profiles exist', async () => {
    nextResult = { data: [], error: null };
    const members = await listTeamMembers();
    expect(members).toEqual([]);
  });

  test('maps user_profiles rows to TeamMember shape (camelCase)', async () => {
    nextResult = {
      data: [
        {
          id: 'u-1',
          email: 'admin@ccc.com',
          full_name: 'Jane Admin',
          avatar_url: 'https://example.com/a.png',
          role: 'ccc_admin',
          assigned_clients: ['org-1', 'org-2'],
          last_active_at: '2026-04-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    };
    const members = await listTeamMembers();
    expect(members).toHaveLength(1);
    expect(members[0]).toEqual({
      id: 'u-1',
      email: 'admin@ccc.com',
      fullName: 'Jane Admin',
      avatarUrl: 'https://example.com/a.png',
      role: 'ccc_admin',
      assignedClients: ['org-1', 'org-2'],
      lastActiveAt: '2026-04-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  test('preserves fullName as null when profile has no display name (Wave 2.D)', async () => {
    nextResult = {
      data: [
        {
          id: 'u-2',
          email: 'new@ccc.com',
          full_name: null, // profile not yet set
          avatar_url: null,
          role: 'ccc_member',
          assigned_clients: null,
          last_active_at: null,
          created_at: '2026-02-01',
        },
      ],
      error: null,
    };
    const members = await listTeamMembers();
    expect(members[0]!.fullName).toBeNull();
    expect(members[0]!.assignedClients).toEqual([]);
  });

  test('throws when the query errors', async () => {
    nextResult = { data: null, error: new Error('RLS: unauthorized') };
    await expect(listTeamMembers()).rejects.toThrow('unauthorized');
  });
});

describe('listInvitations', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
  });

  test('maps invitations rows to camelCase Invitation objects', async () => {
    nextResult = {
      data: [
        {
          id: 'inv-1',
          email: 'new@acme.com',
          role: 'client_exec',
          organization_id: 'org-1',
          expires_at: '2026-05-01',
          created_at: '2026-04-01',
          invited_by: 'u-admin',
        },
      ],
      error: null,
    };
    const invs = await listInvitations('org-1');
    expect(invs).toHaveLength(1);
    expect(invs[0]).toEqual({
      id: 'inv-1',
      email: 'new@acme.com',
      role: 'client_exec',
      organizationId: 'org-1',
      expiresAt: '2026-05-01',
      createdAt: '2026-04-01',
      invitedBy: 'u-admin',
    });
  });

  test('preserves invitedBy null for system/automated invitations (Wave 2.D)', async () => {
    nextResult = {
      data: [
        {
          id: 'inv-2',
          email: 'auto@ccc.com',
          role: 'ccc_member',
          organization_id: null,
          expires_at: '2026-05-01',
          created_at: '2026-04-01',
          invited_by: null,
        },
      ],
      error: null,
    };
    const invs = await listInvitations();
    expect(invs[0]!.invitedBy).toBeNull();
    expect(invs[0]!.organizationId).toBeNull();
  });

  test('throws on query error', async () => {
    nextResult = { data: null, error: new Error('query failed') };
    await expect(listInvitations()).rejects.toThrow('query failed');
  });
});

describe('createInvitation', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    invokeCalls = [];
  });

  test('inserts invitation and invokes send-team-invitation edge function', async () => {
    nextResult = {
      data: {
        id: 'inv-new',
        email: 'a@b.com',
        role: 'client_manager',
        organization_id: 'org-1',
        expires_at: '2026-04-22',
        created_at: '2026-04-15',
        invited_by: 'u-1',
      },
      error: null,
    };
    const inv = await createInvitation({
      email: 'a@b.com',
      role: 'client_manager',
      organizationId: 'org-1',
    });

    expect(inv.id).toBe('inv-new');
    expect(invokeCalls).toHaveLength(1);
    expect(invokeCalls[0]!.fn).toBe('send-team-invitation');
    expect(invokeCalls[0]!.body).toEqual({ invitationId: 'inv-new' });
  });

  test('throws when the insert errors', async () => {
    nextResult = { data: null, error: new Error('email already invited') };
    await expect(
      createInvitation({ email: 'a@b.com', role: 'client_manager' }),
    ).rejects.toThrow('email already invited');
  });
});

describe('updateUserRole', () => {
  beforeEach(() => {
    nextResult = { data: null, error: null };
    lastUpdate = null;
  });

  test('sends role update payload', async () => {
    await updateUserRole({ userId: 'u-1', role: 'ccc_admin' });
    expect(lastUpdate).toEqual({ role: 'ccc_admin' });
  });

  test('throws on update error', async () => {
    nextResult = { data: null, error: new Error('forbidden') };
    await expect(
      updateUserRole({ userId: 'u-1', role: 'ccc_member' }),
    ).rejects.toThrow('forbidden');
  });
});

describe('revokeInvitation', () => {
  beforeEach(() => {
    nextResult = { data: null, error: null };
  });

  test('resolves successfully when delete returns no error', async () => {
    await expect(revokeInvitation('inv-1')).resolves.toBeUndefined();
  });

  test('throws on delete error', async () => {
    nextResult = { data: null, error: new Error('not found') };
    await expect(revokeInvitation('inv-1')).rejects.toThrow('not found');
  });
});
