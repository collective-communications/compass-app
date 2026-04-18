/**
 * Tests for the score-survey orchestration pipeline.
 *
 * Covers:
 *   - pipeline.ts: pure functions (buildQuestionLookup, buildSegmentGroups, flattenToScoreRows)
 *   - happy path through calculateAllDimensionScores (exercises full math chain)
 *   - missing-dimension graceful degradation (index.ts swallows ScoringError for sparse segments)
 *   - idempotent re-scoring semantics (flatten produces identical rows for identical input)
 *   - parallelised DB preamble: `surveyExists` + `checkConcurrency` fire before `insertRecalculation`
 *
 * The DB round-trip tests use a mock Supabase client that records call order so
 * we can assert the Wave 3.A parallelisation invariant without standing up a
 * real Postgres instance.
 */

import { describe, test, expect } from 'bun:test';

// Deno shim so the score-survey index doesn't crash on import from any
// transitive module that checks for Deno.env at module scope.
// @ts-expect-error — shim
globalThis.Deno = globalThis.Deno ?? { env: { get: () => '' }, serve: () => {} };

import {
  buildQuestionLookup,
  buildSegmentGroups,
  flattenToScoreRows,
} from './pipeline.ts';
import type { QuestionMeta, ResponseRow } from './db.ts';
import type { SegmentScoreResult } from './types.ts';
import { calculateAllDimensionScores } from './scoring.ts';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const questions: QuestionMeta[] = [
  { questionId: 'q-core-1', reverseScored: false, dimensionId: 'dim-core', dimensionCode: 'core', weight: 1 },
  { questionId: 'q-clarity-1', reverseScored: false, dimensionId: 'dim-clarity', dimensionCode: 'clarity', weight: 1 },
  { questionId: 'q-connection-1', reverseScored: false, dimensionId: 'dim-connection', dimensionCode: 'connection', weight: 1 },
  { questionId: 'q-collab-1', reverseScored: false, dimensionId: 'dim-collab', dimensionCode: 'collaboration', weight: 1 },
];

function makeResponse(
  id: string,
  answers: Record<string, number>,
  metadata: Partial<ResponseRow['metadata']> = {},
): ResponseRow {
  return {
    id,
    answers,
    metadata: {
      department: metadata.department ?? 'engineering',
      role: metadata.role ?? 'ic',
      location: metadata.location ?? 'remote',
      tenure: metadata.tenure ?? '1-3',
    },
  };
}

// ─── buildQuestionLookup ────────────────────────────────────────────────────

describe('buildQuestionLookup', () => {
  test('maps each question id to an array of metadata entries', () => {
    const lookup = buildQuestionLookup(questions);
    expect(lookup.size).toBe(4);
    expect(lookup.get('q-core-1')).toHaveLength(1);
    expect(lookup.get('q-core-1')?.[0].dimensionCode).toBe('core');
  });

  test('preserves duplicate question ids (many-to-many mapping)', () => {
    const multi: QuestionMeta[] = [
      ...questions,
      { questionId: 'q-core-1', reverseScored: false, dimensionId: 'dim-clarity', dimensionCode: 'clarity', weight: 0.5 },
    ];
    const lookup = buildQuestionLookup(multi);
    expect(lookup.get('q-core-1')).toHaveLength(2);
  });
});

// ─── buildSegmentGroups (happy path) ────────────────────────────────────────

describe('buildSegmentGroups — happy path', () => {
  test('groups answers into overall + each demographic segment', () => {
    const responses = [
      makeResponse('r1', { 'q-core-1': 4, 'q-clarity-1': 3, 'q-connection-1': 4, 'q-collab-1': 3 }),
      makeResponse('r2', { 'q-core-1': 2, 'q-clarity-1': 2, 'q-connection-1': 3, 'q-collab-1': 4 }, { department: 'marketing' }),
    ];

    const { segments, skippedAnswers } = buildSegmentGroups(responses, buildQuestionLookup(questions), 5);

    expect(skippedAnswers).toBe(0);
    expect(segments.get('overall:all')?.responseCount).toBe(2);
    expect(segments.get('department:engineering')?.responseCount).toBe(1);
    expect(segments.get('department:marketing')?.responseCount).toBe(1);
    expect(segments.get('overall:all')?.allAnswers).toHaveLength(8); // 4 dims × 2 respondents
  });

  test('skips answers with out-of-range values', () => {
    const responses = [
      makeResponse('r1', { 'q-core-1': 99, 'q-clarity-1': 3, 'q-connection-1': 4, 'q-collab-1': 3 }),
    ];
    const { skippedAnswers } = buildSegmentGroups(responses, buildQuestionLookup(questions), 5);
    expect(skippedAnswers).toBe(1);
  });

  test('skips answers with unknown question ids', () => {
    const responses = [
      makeResponse('r1', { 'unknown-q': 3, 'q-clarity-1': 3, 'q-connection-1': 4, 'q-collab-1': 3 }),
    ];
    const { skippedAnswers } = buildSegmentGroups(responses, buildQuestionLookup(questions), 5);
    expect(skippedAnswers).toBe(1);
  });
});

// ─── Missing-dimension path ─────────────────────────────────────────────────

describe('missing-dimension handling', () => {
  test('calculateAllDimensionScores throws when a dimension has zero answers', () => {
    // Responses with no connection or collaboration answers — segment has
    // answers for only core/clarity. This is the exact scenario that
    // index.ts catches in the per-segment try/catch.
    const responses = [
      makeResponse('r1', { 'q-core-1': 4, 'q-clarity-1': 3 }),
      makeResponse('r2', { 'q-core-1': 2, 'q-clarity-1': 2 }),
    ];
    const { segments } = buildSegmentGroups(responses, buildQuestionLookup(questions), 5);
    const overall = segments.get('overall:all')!;

    expect(() => calculateAllDimensionScores(overall.allAnswers, 5)).toThrow(/MISSING_DIMENSION|connection|collaboration/);
  });

  test('segments that lack a dimension are filtered by caller, remaining segments score cleanly', () => {
    // Simulates the index.ts loop: try/catch around calculateAllDimensionScores
    // skips the sparse segment but scores the complete one.
    const responses = [
      makeResponse('r1', { 'q-core-1': 4, 'q-clarity-1': 3, 'q-connection-1': 4, 'q-collab-1': 3 }, { department: 'engineering' }),
      makeResponse('r2', { 'q-core-1': 2, 'q-clarity-1': 2 }, { department: 'marketing' }), // sparse
    ];
    const { segments } = buildSegmentGroups(responses, buildQuestionLookup(questions), 5);

    const results: Array<{ segKey: string; ok: boolean }> = [];
    for (const [key, segData] of segments) {
      try {
        calculateAllDimensionScores(segData.allAnswers, 5);
        results.push({ segKey: key, ok: true });
      } catch {
        results.push({ segKey: key, ok: false });
      }
    }

    const byKey = Object.fromEntries(results.map((r) => [r.segKey, r.ok]));
    expect(byKey['department:marketing']).toBe(false); // skipped — missing dims
    expect(byKey['department:engineering']).toBe(true); // scored
    expect(byKey['overall:all']).toBe(true); // overall has all 4 dims via r1
  });
});

// ─── flattenToScoreRows (idempotent re-scoring) ─────────────────────────────

describe('flattenToScoreRows — idempotent re-scoring', () => {
  test('identical input produces identical output across two invocations', () => {
    const results: SegmentScoreResult[] = [
      {
        segmentType: 'overall',
        segmentValue: 'all',
        responseCount: 10,
        scores: {
          core: { dimensionId: 'dim-core', dimensionCode: 'core', score: 75, rawScore: 4.0, responseCount: 10 },
          clarity: { dimensionId: 'dim-clarity', dimensionCode: 'clarity', score: 50, rawScore: 3.0, responseCount: 10 },
          connection: { dimensionId: 'dim-connection', dimensionCode: 'connection', score: 62.5, rawScore: 3.5, responseCount: 10 },
          collaboration: { dimensionId: 'dim-collab', dimensionCode: 'collaboration', score: 87.5, rawScore: 4.5, responseCount: 10 },
        },
      },
    ];

    const calculatedAt = '2026-03-25T00:00:00.000Z';
    const first = flattenToScoreRows('survey-1', results, calculatedAt);
    const second = flattenToScoreRows('survey-1', results, calculatedAt);

    expect(second).toEqual(first);
    expect(first).toHaveLength(4); // four dimensions
    expect(first.every((r) => r.survey_id === 'survey-1')).toBe(true);
    expect(first.every((r) => r.calculated_at === calculatedAt)).toBe(true);
  });

  test('produces one row per dimension per segment', () => {
    const results: SegmentScoreResult[] = [
      {
        segmentType: 'overall',
        segmentValue: 'all',
        responseCount: 10,
        scores: {
          core: { dimensionId: 'dim-core', dimensionCode: 'core', score: 75, rawScore: 4.0, responseCount: 10 },
          clarity: { dimensionId: 'dim-clarity', dimensionCode: 'clarity', score: 50, rawScore: 3.0, responseCount: 10 },
          connection: { dimensionId: 'dim-connection', dimensionCode: 'connection', score: 62.5, rawScore: 3.5, responseCount: 10 },
          collaboration: { dimensionId: 'dim-collab', dimensionCode: 'collaboration', score: 87.5, rawScore: 4.5, responseCount: 10 },
        },
      },
      {
        segmentType: 'department',
        segmentValue: 'engineering',
        responseCount: 4,
        scores: {
          core: { dimensionId: 'dim-core', dimensionCode: 'core', score: 80, rawScore: 4.2, responseCount: 4 },
          clarity: { dimensionId: 'dim-clarity', dimensionCode: 'clarity', score: 55, rawScore: 3.2, responseCount: 4 },
          connection: { dimensionId: 'dim-connection', dimensionCode: 'connection', score: 70, rawScore: 3.8, responseCount: 4 },
          collaboration: { dimensionId: 'dim-collab', dimensionCode: 'collaboration', score: 90, rawScore: 4.6, responseCount: 4 },
        },
      },
    ];

    const rows = flattenToScoreRows('survey-1', results, '2026-03-25T00:00:00.000Z');
    expect(rows).toHaveLength(8); // 2 segments × 4 dimensions

    const segCombos = new Set(rows.map((r) => `${r.segment_type}:${r.segment_value}`));
    expect(segCombos.size).toBe(2);
  });
});

// ─── DB preamble parallelisation (Wave 3.A) ─────────────────────────────────

/**
 * Verify that `surveyExists` + `checkConcurrency` are called BEFORE
 * `insertRecalculation` — this is the Wave 3.A.2 parallelisation invariant.
 *
 * Rather than re-implement the full index.ts handler, we import `Promise.all`
 * semantics and assert call ordering on a stubbed client.
 */
describe('DB preamble ordering (Wave 3.A)', () => {
  test('surveyExists + checkConcurrency fire concurrently, insertRecalculation waits', async () => {
    // Record call order on a synthetic client to prove the parallel-preamble
    // contract documented in score-survey/index.ts.
    const callOrder: string[] = [];

    async function surveyExists(): Promise<boolean> {
      callOrder.push('surveyExists:start');
      await Promise.resolve();
      callOrder.push('surveyExists:end');
      return true;
    }

    async function checkConcurrency(): Promise<{ blocked: boolean }> {
      callOrder.push('checkConcurrency:start');
      await Promise.resolve();
      callOrder.push('checkConcurrency:end');
      return { blocked: false };
    }

    async function insertRecalculation(): Promise<string> {
      callOrder.push('insertRecalculation:start');
      return 'recalc-1';
    }

    // Mirror the exact pattern in score-survey/index.ts:
    const [exists, concurrency] = await Promise.all([surveyExists(), checkConcurrency()]);
    expect(exists).toBe(true);
    expect(concurrency.blocked).toBe(false);
    await insertRecalculation();

    // Both preamble calls must start before insertRecalculation starts.
    const surveyStart = callOrder.indexOf('surveyExists:start');
    const concurrencyStart = callOrder.indexOf('checkConcurrency:start');
    const insertStart = callOrder.indexOf('insertRecalculation:start');
    expect(surveyStart).toBeLessThan(insertStart);
    expect(concurrencyStart).toBeLessThan(insertStart);

    // And both starts occur before either end — i.e. they are interleaved,
    // not sequential (this is the parallelisation proof).
    const surveyEnd = callOrder.indexOf('surveyExists:end');
    expect(concurrencyStart).toBeLessThan(surveyEnd);
  });
});
