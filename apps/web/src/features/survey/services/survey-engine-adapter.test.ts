import { describe, test, expect, mock, beforeEach } from 'bun:test';

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { message: string };
}

let queryResult: MockResult = { data: null, error: null };

function makeChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = (): Record<string, unknown> => chain;

  chain.select = self;
  chain.eq = self;
  chain.single = (): Promise<MockResult> => Promise.resolve(queryResult);
  chain.maybeSingle = (): Promise<MockResult> => Promise.resolve(queryResult);

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: () => makeChain(),
  },
}));

const { createSurveyEngineAdapter } = await import('./survey-engine-adapter.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('resolveDeployment', () => {
  const adapter = createSurveyEngineAdapter();

  beforeEach(() => {
    queryResult = { data: null, error: null };
  });

  test('returns not_found for invalid token', async () => {
    queryResult = { data: null, error: { message: 'not found' } };

    const result = await adapter.resolveDeployment('bad-token');
    expect(result.status).toBe('not_found');
    expect(result.message).toBeTruthy();
  });

  test('returns valid for active deployment with active survey', async () => {
    queryResult = {
      data: {
        id: 'd1',
        survey_id: 's1',
        token: 'tok',
        type: 'anonymous_link',
        settings: null,
        expires_at: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2026-01-01',
        survey: {
          id: 's1',
          organization_id: 'org1',
          title: 'Test Survey',
          description: null,
          status: 'active',
          opens_at: '2025-01-01',
          closes_at: '2027-12-31',
          settings: null,
          scores_calculated: false,
          scores_calculated_at: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          created_by: null,
        },
      },
      error: null,
    };

    const result = await adapter.resolveDeployment('valid-token');
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.deployment.id).toBe('d1');
      expect(result.survey.title).toBe('Test Survey');
    }
  });

  test('returns closed for closed survey', async () => {
    queryResult = {
      data: {
        id: 'd1',
        survey_id: 's1',
        token: 'tok',
        type: 'anonymous_link',
        settings: null,
        expires_at: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2026-01-01',
        survey: {
          id: 's1',
          organization_id: 'org1',
          title: 'Closed Survey',
          description: null,
          status: 'closed',
          opens_at: '2025-01-01',
          closes_at: '2026-01-15',
          settings: null,
          scores_calculated: false,
          scores_calculated_at: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          created_by: null,
        },
      },
      error: null,
    };

    const result = await adapter.resolveDeployment('closed-token');
    expect(result.status).toBe('closed');
    if (result.status === 'closed') {
      expect(result.message).toContain('closed');
      expect(result.closesAt).toBe('2026-01-15');
    }
  });

  test('returns not_yet_open for future opens_at', async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 30).toISOString();
    queryResult = {
      data: {
        id: 'd1',
        survey_id: 's1',
        token: 'tok',
        type: 'anonymous_link',
        settings: null,
        expires_at: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2026-01-01',
        survey: {
          id: 's1',
          organization_id: 'org1',
          title: 'Future Survey',
          description: null,
          status: 'active',
          opens_at: futureDate,
          closes_at: null,
          settings: null,
          scores_calculated: false,
          scores_calculated_at: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          created_by: null,
        },
      },
      error: null,
    };

    const result = await adapter.resolveDeployment('future-token');
    expect(result.status).toBe('not_yet_open');
    if (result.status === 'not_yet_open') {
      expect(result.opensAt).toBe(futureDate);
    }
  });

  test('returns expired for expired deployment', async () => {
    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    queryResult = {
      data: {
        id: 'd1',
        survey_id: 's1',
        token: 'tok',
        type: 'anonymous_link',
        settings: null,
        expires_at: pastDate,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2026-01-01',
        survey: {
          id: 's1',
          organization_id: 'org1',
          title: 'Expired Survey',
          description: null,
          status: 'active',
          opens_at: '2025-01-01',
          closes_at: null,
          settings: null,
          scores_calculated: false,
          scores_calculated_at: null,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          created_by: null,
        },
      },
      error: null,
    };

    const result = await adapter.resolveDeployment('expired-token');
    expect(result.status).toBe('expired');
    if (result.status === 'expired') {
      expect(result.message).toContain('expired');
    }
  });

  test('returns not_found when survey not found for deployment', async () => {
    queryResult = {
      data: {
        id: 'd1',
        survey_id: 's1',
        token: 'tok',
        type: 'anonymous_link',
        settings: null,
        expires_at: null,
        access_count: 0,
        last_accessed_at: null,
        created_at: '2026-01-01',
        survey: null,
      },
      error: null,
    };

    const result = await adapter.resolveDeployment('orphan-token');
    expect(result.status).toBe('not_found');
  });
});
