import { describe, test, expect, beforeEach } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@compass/types';
import { configureSdk } from '@compass/sdk';
import { listOrganizations, createOrganization } from './client-service';

/**
 * Tests for the admin client service — exercises listOrganizations (with
 * the organization_settings JOIN for logo_url, per Wave 2.D) and
 * createOrganization (slug generation + insert).
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
}

let nextResult: MockResult = { data: [], error: null };
let lastSelect: string | null = null;
let lastInsert: unknown = null;

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = (cols?: unknown) => {
    if (typeof cols === 'string') lastSelect = cols;
    return chain;
  };
  chain.insert = (payload: unknown) => {
    lastInsert = payload;
    return chain;
  };
  chain.order = self;
  chain.limit = self;
  chain.eq = self;
  chain.single = () => Promise.resolve(nextResult);

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(nextResult).then(onFulfilled, onRejected);

  return chain;
}

configureSdk({
  client: { from: () => makeChain() } as unknown as SupabaseClient<Database>,
  surveySessionClient: () => ({ from: () => ({}) }) as unknown as SupabaseClient<Database>,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('listOrganizations', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastSelect = null;
    lastInsert = null;
  });

  test('selects the organization_settings join (Wave 2.D: logo_url lives there)', async () => {
    nextResult = { data: [], error: null };
    await listOrganizations();
    expect(lastSelect).toContain('organization_settings');
    expect(lastSelect).toContain('logo_url');
  });

  test('maps logo_url from the joined organization_settings row (object form)', async () => {
    nextResult = {
      data: [
        {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme',
          industry: 'Tech',
          employee_count: 250,
          primary_contact_name: 'Jane',
          primary_contact_email: 'jane@acme.com',
          created_at: '2026-01-01',
          surveys: [
            { id: 's-1', title: 'Q1', status: 'active', closes_at: '2099-12-31' },
          ],
          organization_settings: { logo_url: 'https://acme.com/logo.png' },
        },
      ],
      error: null,
    };

    const orgs = await listOrganizations();
    expect(orgs).toHaveLength(1);
    expect(orgs[0]!.logoUrl).toBe('https://acme.com/logo.png');
    expect(orgs[0]!.name).toBe('Acme Corp');
  });

  test('handles organization_settings returned as an array (supabase to-one variant)', async () => {
    nextResult = {
      data: [
        {
          id: 'org-2',
          name: 'Beta Inc',
          slug: 'beta',
          industry: null,
          employee_count: null,
          primary_contact_name: null,
          primary_contact_email: null,
          created_at: '2026-01-01',
          surveys: [],
          organization_settings: [{ logo_url: 'https://beta.com/logo.svg' }],
        },
      ],
      error: null,
    };
    const orgs = await listOrganizations();
    expect(orgs[0]!.logoUrl).toBe('https://beta.com/logo.svg');
  });

  test('returns null logoUrl when no organization_settings row exists', async () => {
    nextResult = {
      data: [
        {
          id: 'org-3',
          name: 'Gamma',
          slug: 'gamma',
          industry: null,
          employee_count: null,
          primary_contact_name: null,
          primary_contact_email: null,
          created_at: '2026-01-01',
          surveys: [],
          organization_settings: null,
        },
      ],
      error: null,
    };
    const orgs = await listOrganizations();
    expect(orgs[0]!.logoUrl).toBeNull();
  });

  test('computes totalSurveys and selects the active survey id/title', async () => {
    nextResult = {
      data: [
        {
          id: 'org-4',
          name: 'Delta',
          slug: 'delta',
          industry: null,
          employee_count: null,
          primary_contact_name: null,
          primary_contact_email: null,
          created_at: '2026-01-01',
          surveys: [
            { id: 'active-survey', title: 'Active One', status: 'active', closes_at: null },
            { id: 'old-survey', title: 'Old', status: 'closed', closes_at: null },
          ],
          organization_settings: null,
        },
      ],
      error: null,
    };
    const orgs = await listOrganizations();
    expect(orgs[0]!.totalSurveys).toBe(2);
    expect(orgs[0]!.activeSurveyId).toBe('active-survey');
    expect(orgs[0]!.activeSurveyTitle).toBe('Active One');
  });

  test('throws when the query errors', async () => {
    nextResult = { data: null, error: new Error('RLS denied') };
    await expect(listOrganizations()).rejects.toThrow('RLS denied');
  });
});

describe('createOrganization', () => {
  beforeEach(() => {
    nextResult = { data: [], error: null };
    lastInsert = null;
  });

  test('derives a URL-safe slug from the organization name', async () => {
    nextResult = {
      data: {
        id: 'new-org',
        name: 'Acme Corp!',
        slug: 'acme-corp',
        industry: null,
        employee_count: null,
        primary_contact_name: null,
        primary_contact_email: null,
        created_at: '2026-01-01',
      },
      error: null,
    };
    await createOrganization({ name: 'Acme Corp!' });
    const payload = lastInsert as Record<string, unknown>;
    expect(payload['name']).toBe('Acme Corp!');
    expect(payload['slug']).toBe('acme-corp');
  });

  test('returns the created org with logoUrl=null (settings row not created yet)', async () => {
    nextResult = {
      data: {
        id: 'new-org',
        name: 'Test',
        slug: 'test',
        industry: null,
        employee_count: null,
        primary_contact_name: null,
        primary_contact_email: null,
        created_at: '2026-01-01',
      },
      error: null,
    };
    const org = await createOrganization({ name: 'Test' });
    expect(org.id).toBe('new-org');
    expect(org.logoUrl).toBeNull();
  });

  test('throws when the insert errors', async () => {
    nextResult = { data: null, error: new Error('insert failed') };
    await expect(createOrganization({ name: 'x' })).rejects.toThrow('insert failed');
  });
});
