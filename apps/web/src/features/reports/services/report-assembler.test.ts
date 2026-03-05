import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for assembleReportPayload.
 *
 * The assembler calls supabase queries across multiple tables.
 * We mock the supabase module with a chainable query builder
 * that tracks call order to distinguish multiple calls to the same table.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | Error;
  count?: number;
}

/** Ordered list of results returned for each .from() call */
let fromCallResults: MockResult[] = [];
let fromCallIndex = 0;

function makeChain(resultIndex: number): Record<string, unknown> {
  const getResult = (): MockResult => fromCallResults[resultIndex] ?? { data: null, error: null };

  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = self;
  chain.is = self;
  chain.order = self;
  chain.single = () => Promise.resolve(getResult());

  // Make the chain itself a thenable for direct await (non-.single() queries)
  (chain as Record<string, unknown>).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => {
    return Promise.resolve(getResult()).then(onFulfilled, onRejected);
  };

  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: (_table: string) => {
      const idx = fromCallIndex++;
      return makeChain(idx);
    },
  },
}));

const { assembleReportPayload } = await import('./report-assembler.js');

// ─── Fixtures ───────────────────────────────────────────────────────────────

/**
 * Sets up mock results in the order they'll be consumed by assembleReportPayload.
 *
 * The assembler issues these queries via Promise.all:
 *  [0] surveys (survey details) — .single()
 *  [1] surveys (org join via fetchOrganizationForSurvey) — .single()
 *  [2] scores — awaited as array
 *  [3] safe_segment_scores — awaited as array
 *  [4] recommendations — awaited as array
 *
 * Then sequentially:
 *  [5] responses (count query) — awaited as { count }
 *
 * Note: Promise.all fires [0]-[4] simultaneously, and fetchOrganizationForSurvey
 * is called inside the Promise.all (index 1 is nested within index 0's resolution
 * conceptually, but since from() is called during Promise.all construction, not
 * after resolution, it gets index 1).
 *
 * Actually let's trace the code more carefully. The Promise.all contains:
 *  - supabase.from('surveys')...single()           → from() call #0
 *  - fetchOrganizationForSurvey(id)                 → calls from('surveys') internally → from() call #1
 *  - supabase.from('scores')...                     → from() call #2
 *  - supabase.from('safe_segment_scores')...        → from() call #3
 *  - supabase.from('recommendations')...            → from() call #4
 *
 * After Promise.all resolves:
 *  - supabase.from('responses')...                  → from() call #5
 */
function setupMocks(overrides?: {
  survey?: Record<string, unknown>;
  org?: Record<string, unknown>;
  scores?: Record<string, unknown>[];
  segmentScores?: Record<string, unknown>[];
  recommendations?: Record<string, unknown>[];
  responseCount?: number;
}): void {
  fromCallIndex = 0;

  const survey = {
    id: 'survey-1',
    title: 'Q1 Assessment',
    scores_calculated: true,
    archetype: 'The Connector',
    archetype_description: 'Builds bridges',
    closes_at: '2026-04-01',
    organization_id: 'org-1',
    ...overrides?.survey,
  };

  const org = overrides?.org ?? {
    organization_id: 'org-1',
    organizations: {
      name: 'Acme Corp',
      logo_url: 'https://example.com/logo.png',
      settings: {
        brand_colors: { primary: '#0A3B4F', accent: '#FF7F50' },
      },
    },
  };

  const scores = overrides?.scores ?? [
    { raw_score: 3.2, dimensions: { code: 'core', name: 'Core Culture' } },
    { raw_score: 2.4, dimensions: { code: 'clarity', name: 'Clarity' } },
  ];

  const segmentScores = overrides?.segmentScores ?? [
    { segment_type: 'department', segment_value: 'engineering', dimension_code: 'core', raw_score: 3.5, is_masked: false },
    { segment_type: 'department', segment_value: 'marketing', dimension_code: 'core', raw_score: 2.1, is_masked: true },
  ];

  const recommendations = overrides?.recommendations ?? [
    { dimension_code: 'clarity', severity: 'high', severity_rank: 1, title: 'Improve Clarity', description: 'Focus on clear communication', actions: ['Action 1', 'Action 2'] },
    { dimension_code: 'core', severity: 'medium', severity_rank: 2, title: 'Strengthen Core', description: 'Build cultural foundation', actions: ['Action 3'] },
  ];

  fromCallResults = [
    { data: survey, error: null },                                    // [0] surveys (main)
    { data: org, error: null },                                       // [1] surveys (org join)
    { data: scores, error: null },                                    // [2] scores
    { data: segmentScores, error: null },                             // [3] safe_segment_scores
    { data: recommendations, error: null },                           // [4] recommendations
    { data: null, error: null, count: overrides?.responseCount ?? 42 }, // [5] responses
  ];
}

const defaultConfig = {
  surveyId: 'survey-1',
  format: 'pdf' as const,
  sections: [
    { id: 'cover', label: 'Cover Page', included: true, locked: true },
    { id: 'executive_summary', label: 'Executive Summary', included: true },
    { id: 'recommendations', label: 'Recommendations', included: true },
  ],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('assembleReportPayload', () => {
  beforeEach(() => {
    fromCallIndex = 0;
    fromCallResults = [];
  });

  test('returns correct ReportPayload structure from valid data', async () => {
    setupMocks();
    const payload = await assembleReportPayload(defaultConfig);

    expect(payload.survey.id).toBe('survey-1');
    expect(payload.survey.title).toBe('Q1 Assessment');
    expect(payload.survey.organizationName).toBe('Acme Corp');
    expect(payload.survey.responseCount).toBe(42);
    expect(payload.scores.dimensions).toBeDefined();
    expect(payload.compass.archetype).toBe('The Connector');
    expect(payload.recommendations).toBeArray();
    expect(payload.branding).toBeDefined();
    expect(payload.sections).toBeArray();
  });

  test('filters out masked segments (is_masked = true)', async () => {
    setupMocks();
    const payload = await assembleReportPayload(defaultConfig);

    const segmentKeys = Object.keys(payload.scores.segments);
    expect(segmentKeys).toContain('department:engineering');
    expect(segmentKeys).not.toContain('department:marketing');
  });

  test('calculates overall score as average of dimension raw scores', async () => {
    setupMocks({
      scores: [
        { raw_score: 3.0, dimensions: { code: 'core', name: 'Core' } },
        { raw_score: 2.0, dimensions: { code: 'clarity', name: 'Clarity' } },
        { raw_score: 4.0, dimensions: { code: 'connection', name: 'Connection' } },
      ],
    });
    const payload = await assembleReportPayload(defaultConfig);

    expect(payload.scores.overall).toBe(3.0);
  });

  test('maps dimension percentages correctly: (rawScore / 4) * 100', async () => {
    setupMocks({
      scores: [
        { raw_score: 3.2, dimensions: { code: 'core', name: 'Core' } },
      ],
    });
    const payload = await assembleReportPayload(defaultConfig);

    expect(payload.compass.dimensionPercentages['core']).toBe(80); // (3.2 / 4) * 100
  });

  test('throws when scores_calculated = false', async () => {
    setupMocks({ survey: { scores_calculated: false } });

    await expect(assembleReportPayload(defaultConfig)).rejects.toThrow(
      'Survey scores have not been calculated',
    );
  });

  test('includes recommendations sorted by severity_rank', async () => {
    setupMocks();
    const payload = await assembleReportPayload(defaultConfig);

    expect(payload.recommendations).toHaveLength(2);
    expect(payload.recommendations[0].title).toBe('Improve Clarity');
    expect(payload.recommendations[1].title).toBe('Strengthen Core');
  });

  test('maps organization branding from settings.brand_colors', async () => {
    setupMocks();
    const payload = await assembleReportPayload(defaultConfig);

    expect(payload.branding.colors).toEqual({ primary: '#0A3B4F', accent: '#FF7F50' });
    expect(payload.branding.orgLogoUrl).toBe('https://example.com/logo.png');
  });

  test('filters sections to only those marked as included', async () => {
    setupMocks();
    const config = {
      ...defaultConfig,
      sections: [
        { id: 'cover', label: 'Cover', included: true, locked: true },
        { id: 'executive_summary', label: 'Exec Summary', included: false },
        { id: 'recommendations', label: 'Recommendations', included: true },
      ],
    };
    const payload = await assembleReportPayload(config);

    expect(payload.sections).toHaveLength(2);
    expect(payload.sections.every((s) => s.included)).toBe(true);
  });
});
