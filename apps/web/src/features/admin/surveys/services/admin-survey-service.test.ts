import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for the admin survey service — exercises CRUD and question
 * reordering. The supabase client is mocked with a chainable builder that
 * returns queued results, so each assertion can verify the exact shape of
 * the emitted query.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
  count?: number;
}

let fromCalls: Array<{ table: string; chain: Record<string, unknown> }> = [];
let nextResults: MockResult[] = [];
let resultIndex = 0;

let rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let nextRpcResult: MockResult = { data: null, error: null };

function queueResult(r: MockResult): void {
  nextResults.push(r);
}

function makeChain(table: string): Record<string, unknown> {
  const getResult = (): MockResult => nextResults[resultIndex++] ?? { data: null, error: null };
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.insert = (payload: unknown) => {
    (chain as Record<string, unknown>).__insertPayload = payload;
    return chain;
  };
  chain.update = (payload: unknown) => {
    (chain as Record<string, unknown>).__updatePayload = payload;
    return chain;
  };
  chain.delete = self;
  chain.eq = self;
  chain.or = self;
  chain.in = self;
  chain.is = self;
  chain.order = self;
  chain.limit = self;
  chain.single = () => Promise.resolve(getResult());
  chain.maybeSingle = () => Promise.resolve(getResult());

  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(getResult()).then(onFulfilled, onRejected);

  fromCalls.push({ table, chain: chain as unknown as Record<string, unknown> });
  return chain;
}

mock.module('../../../../lib/supabase', () => ({
  surveySessionClient: () => ({ from: () => ({}) }),
  supabase: {
    from: (table: string) => makeChain(table),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(nextRpcResult);
    },
  },
}));

const {
  listSurveys,
  createSurvey,
  updateSurveyStatus,
  reorderQuestions,
  updateQuestion,
} = await import('./admin-survey-service.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

function reset(): void {
  fromCalls = [];
  nextResults = [];
  resultIndex = 0;
  rpcCalls = [];
  nextRpcResult = { data: null, error: null };
}

describe('listSurveys', () => {
  beforeEach(reset);

  test('queries the surveys table with the org filter when organizationId is set', async () => {
    queueResult({ data: [], error: null });
    await listSurveys('org-1');

    expect(fromCalls[0]!.table).toBe('surveys');
  });

  test('maps deployments[*].responses.count to responseCount per survey', async () => {
    queueResult({
      data: [
        {
          id: 'survey-1',
          organization_id: 'org-1',
          title: 'Q1',
          status: 'active',
          opens_at: null,
          closes_at: null,
          settings: null,
          scores_calculated: false,
          scores_calculated_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          created_by: 'u-1',
          deployments: [
            { token: 'abc', is_active: true, responses: [{ count: 24 }] },
            { token: 'xyz', is_active: false, responses: [{ count: 6 }] },
          ],
        },
      ],
      error: null,
    });

    const results = await listSurveys('org-1');
    expect(results).toHaveLength(1);
    expect(results[0]!.responseCount).toBe(30);
    expect(results[0]!.activeDeploymentToken).toBe('abc');
  });

  test('returns empty array when no surveys found', async () => {
    queueResult({ data: [], error: null });
    const results = await listSurveys('org-1');
    expect(results).toEqual([]);
  });

  test('throws when the query returns an error', async () => {
    queueResult({ data: null, error: new Error('RLS failure') });
    await expect(listSurveys('org-1')).rejects.toThrow('RLS failure');
  });
});

describe('createSurvey', () => {
  beforeEach(reset);

  test('inserts a new survey and triggers system-template copy when no template is provided', async () => {
    // [0] surveys insert → returns new survey row
    queueResult({
      data: {
        id: 'new-survey',
        organization_id: 'org-1',
        title: 'New Survey',
        status: 'draft',
        opens_at: null,
        closes_at: null,
        settings: null,
        scores_calculated: false,
        scores_calculated_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: 'u-1',
      },
      error: null,
    });
    // [1] resolveSystemTemplateId → returns { id: 'tpl-system' }
    queueResult({ data: { id: 'tpl-system' }, error: null });
    // [2] survey_templates fetch questions → empty array, skips dimension insert path
    queueResult({ data: { questions: [] }, error: null });

    const survey = await createSurvey({
      organizationId: 'org-1',
      title: 'New Survey',
      createdBy: 'u-1',
    });

    expect(survey.id).toBe('new-survey');
    expect(survey.title).toBe('New Survey');
    expect(survey.status).toBe('draft');

    // The first .from() call was the surveys insert
    expect(fromCalls[0]!.table).toBe('surveys');
    // survey_templates was consulted for the system template lookup + question copy
    expect(fromCalls.some((c) => c.table === 'survey_templates')).toBe(true);
  });

  test('throws when survey insert fails', async () => {
    queueResult({ data: null, error: new Error('insert failed') });
    await expect(
      createSurvey({ organizationId: 'org-1', title: 't', createdBy: 'u' }),
    ).rejects.toThrow('insert failed');
  });
});

describe('updateSurveyStatus', () => {
  beforeEach(reset);

  test('sends an update to the surveys table and resolves on success', async () => {
    queueResult({ data: null, error: null });
    await expect(updateSurveyStatus('survey-1', 'active')).resolves.toBeUndefined();
    expect(fromCalls[0]!.table).toBe('surveys');
    expect(fromCalls[0]!.chain.__updatePayload).toEqual({ status: 'active' });
  });

  test('throws when the update errors', async () => {
    queueResult({ data: null, error: new Error('nope') });
    await expect(updateSurveyStatus('survey-1', 'closed')).rejects.toThrow('nope');
  });
});

describe('reorderQuestions', () => {
  beforeEach(reset);

  test('calls the reorder_questions RPC with the survey and ordered IDs', async () => {
    nextRpcResult = { data: null, error: null };
    await reorderQuestions('survey-1', [
      { questionId: 'q-1', newOrder: 1 },
      { questionId: 'q-2', newOrder: 2 },
    ]);

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]!.fn).toBe('reorder_questions');
    expect(rpcCalls[0]!.args).toEqual({
      p_survey_id: 'survey-1',
      p_question_ids: ['q-1', 'q-2'],
      p_new_orders: [1, 2],
    });
  });

  test('throws when the RPC returns an error', async () => {
    nextRpcResult = { data: null, error: new Error('RPC failed') };
    await expect(
      reorderQuestions('survey-1', [{ questionId: 'q-1', newOrder: 1 }]),
    ).rejects.toThrow('RPC failed');
  });
});

describe('updateQuestion', () => {
  beforeEach(reset);

  test('maps camelCase params to snake_case update payload', async () => {
    queueResult({
      data: {
        id: 'q-1',
        survey_id: 'survey-1',
        text: 'updated text',
        description: null,
        type: 'likert',
        reverse_scored: true,
        options: null,
        required: true,
        order_index: 1,
        sub_dimension_id: 'sub-1',
        diagnostic_focus: 'focus-updated',
        recommended_action: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      error: null,
    });

    const result = await updateQuestion({
      id: 'q-1',
      text: 'updated text',
      reverseScored: true,
      diagnosticFocus: 'focus-updated',
      subDimensionId: 'sub-1',
    });

    expect(result.id).toBe('q-1');
    expect(result.text).toBe('updated text');
    expect(result.reverseScored).toBe(true);
    expect(result.subDimensionId).toBe('sub-1');

    const payload = fromCalls[0]!.chain.__updatePayload as Record<string, unknown>;
    expect(payload['text']).toBe('updated text');
    expect(payload['reverse_scored']).toBe(true);
    expect(payload['diagnostic_focus']).toBe('focus-updated');
    expect(payload['sub_dimension_id']).toBe('sub-1');
  });

  test('throws when the update returns an error', async () => {
    queueResult({ data: null, error: new Error('update failed') });
    await expect(updateQuestion({ id: 'q-1', text: 'x' })).rejects.toThrow('update failed');
  });
});
