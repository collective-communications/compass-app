import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';

/**
 * Tests for useSegmentQuestionScores — verifies the RPC call shape and the
 * row→QuestionScoreRow transform, plus the isMasked anonymity flag.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

let rpcCalls: RpcCall[] = [];
let rpcResult: { data: unknown; error: null | Error } = { data: [], error: null };

mock.module('../../../lib/supabase', () => ({
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResult);
    },
  },
}));

const { useSegmentQuestionScores } = await import('./use-segment-question-scores.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    question_id: 'q-1',
    question_text: 'How engaged do you feel?',
    order_index: 1,
    is_reverse_scored: false,
    sub_dimension_code: 'engagement',
    sub_dimension_name: 'Engagement',
    dimension_id: 'dim-core',
    dimension_code: 'core',
    dimension_name: 'Core',
    dimension_color: '#0C3D50',
    response_count: 42,
    mean_score: 3.8,
    dist_1: 1,
    dist_2: 2,
    dist_3: 10,
    dist_4: 20,
    dist_5: 9,
    dist_6: 0,
    dist_7: 0,
    dist_8: 0,
    dist_9: 0,
    dist_10: 0,
    is_masked: false,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSegmentQuestionScores', () => {
  beforeEach(() => {
    rpcCalls = [];
    rpcResult = { data: [], error: null };
  });

  test('is disabled when surveyId is empty', () => {
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: '',
          segmentType: 'department',
          segmentValue: 'engineering',
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  test('is disabled when segmentValue is "all"', () => {
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'all',
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(rpcCalls).toHaveLength(0);
  });

  test('is disabled when segmentType is empty', () => {
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: '',
          segmentValue: 'engineering',
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  test('calls the get_segment_question_scores RPC with the correct args', async () => {
    rpcResult = { data: [makeRow()], error: null };
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'engineering',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]!.fn).toBe('get_segment_question_scores');
    expect(rpcCalls[0]!.args).toEqual({
      p_survey_id: 'survey-1',
      p_segment_type: 'department',
      p_segment_value: 'engineering',
    });
  });

  test('transforms rows into QuestionScoreRow shape with computed distribution', async () => {
    rpcResult = {
      data: [
        makeRow({
          question_id: 'q-1',
          question_text: 'Do you trust leadership?',
          dimension_code: 'core',
          mean_score: 4.1,
          dist_1: 0,
          dist_2: 0,
          dist_3: 0,
          dist_4: 8,
          dist_5: 4,
        }),
      ],
      error: null,
    };

    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'engineering',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const payload = result.current.data!;
    expect(payload.questions).toHaveLength(1);
    const q = payload.questions[0]!;
    expect(q.questionId).toBe('q-1');
    expect(q.questionText).toBe('Do you trust leadership?');
    expect(q.dimensionCode).toBe('core');
    expect(q.meanScore).toBe(4.1);
    // dist_5 was the highest non-zero column — distribution keys go 1..5
    expect(Object.keys(q.distribution)).toEqual(['1', '2', '3', '4', '5']);
    expect(q.distribution[4]).toBe(8);
    expect(q.distribution[5]).toBe(4);
    expect(q.subDimensionCode).toBe('engagement');
    expect(q.subDimensionName).toBe('Engagement');
  });

  test('reports isMasked true when the first row is masked', async () => {
    rpcResult = {
      data: [makeRow({ is_masked: true })],
      error: null,
    };
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'small-group',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.isMasked).toBe(true);
  });

  test('returns isMasked false and empty questions on empty result', async () => {
    rpcResult = { data: [], error: null };
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'marketing',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.questions).toEqual([]);
    expect(result.current.data!.isMasked).toBe(false);
  });

  test('surfaces error state when the RPC returns an error', async () => {
    rpcResult = { data: null, error: new Error('RPC failure: 401') };
    const { result } = renderHook(
      () =>
        useSegmentQuestionScores({
          surveyId: 'survey-1',
          segmentType: 'department',
          segmentValue: 'engineering',
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('RPC failure');
  });
});
