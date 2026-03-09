import { describe, expect, test } from 'bun:test';
import { groupResponsesBySegment, computeSegmentedScores, segmentKey, OVERALL_SEGMENT, SEGMENT_TYPES } from './segments.js';
import { ScoringError } from './errors.js';
import type { AnswerWithMeta, DimensionCode } from './types.js';
import type { ResponseWithMeta } from './segment-types.js';

function makeAnswer(overrides: Partial<AnswerWithMeta> = {}): AnswerWithMeta {
  return {
    questionId: 'q1',
    value: 3,
    reverseScored: false,
    dimensionId: 'dim-core',
    dimensionCode: 'core',
    weight: 1,
    ...overrides,
  };
}

function makeFullAnswers(): AnswerWithMeta[] {
  const dims: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];
  return dims.map((code) =>
    makeAnswer({ dimensionCode: code, dimensionId: `dim-${code}`, questionId: `q-${code}` }),
  );
}

function makeResponse(overrides: Partial<ResponseWithMeta> = {}): ResponseWithMeta {
  return {
    responseId: 'r1',
    metadata: {
      department: 'Engineering',
      role: 'Developer',
      location: 'Toronto',
      tenure: '1-3 years',
    },
    answers: makeFullAnswers(),
    ...overrides,
  };
}

describe('segmentKey', () => {
  test('produces type:value format', () => {
    expect(segmentKey({ type: 'department', value: 'Eng' })).toBe('department:Eng');
  });

  test('overall segment key', () => {
    expect(segmentKey(OVERALL_SEGMENT)).toBe('overall:all');
  });
});

describe('groupResponsesBySegment', () => {
  test('throws on empty responses', () => {
    expect(() => groupResponsesBySegment([])).toThrow(ScoringError);
    try {
      groupResponsesBySegment([]);
    } catch (e) {
      expect((e as ScoringError).code).toBe('EMPTY_ANSWERS');
    }
  });

  test('creates overall and segment buckets', () => {
    const groups = groupResponsesBySegment([makeResponse()]);
    expect(groups.has('overall:all')).toBe(true);
    expect(groups.has('department:Engineering')).toBe(true);
    expect(groups.has('role:Developer')).toBe(true);
    expect(groups.has('location:Toronto')).toBe(true);
    expect(groups.has('tenure:1-3 years')).toBe(true);
  });

  test('overall contains all answers', () => {
    const r1 = makeResponse({ responseId: 'r1' });
    const r2 = makeResponse({ responseId: 'r2', metadata: { ...makeResponse().metadata, department: 'Sales' } });
    const groups = groupResponsesBySegment([r1, r2]);
    expect(groups.get('overall:all')!.length).toBe(8); // 4 answers * 2 responses
  });

  test('throws on missing metadata field', () => {
    const bad = makeResponse();
    (bad.metadata as any).department = undefined;
    expect(() => groupResponsesBySegment([bad])).toThrow(ScoringError);
  });

  test('throws on empty metadata value', () => {
    const bad = makeResponse();
    bad.metadata.role = '   ';
    expect(() => groupResponsesBySegment([bad])).toThrow(ScoringError);
  });

  test('groups same segment values together', () => {
    const r1 = makeResponse({ responseId: 'r1' });
    const r2 = makeResponse({ responseId: 'r2' });
    const groups = groupResponsesBySegment([r1, r2]);
    expect(groups.get('department:Engineering')!.length).toBe(8);
  });
});

describe('computeSegmentedScores', () => {
  test('returns overall and segment scores', () => {
    const result = computeSegmentedScores('survey-1', [makeResponse()]);
    expect(result.surveyId).toBe('survey-1');
    expect(result.overall.segment).toEqual(OVERALL_SEGMENT);
    expect(result.overall.responseCount).toBe(1);
    expect(result.segments.length).toBe(4); // one per segment type
    expect(result.calculatedAt).toBeTruthy();
  });

  test('throws on empty responses', () => {
    expect(() => computeSegmentedScores('survey-1', [])).toThrow(ScoringError);
  });

  // Anonymity threshold (default: 5 responses minimum per segment) is enforced
  // at the database level via the safe_segment_scores view, not in the scoring
  // package. See Story: "Analyzes segments" acceptance criterion:
  // "Anonymity at DB level — safe_segment_scores view enforces minimum response count"

  test('multiple responses with different segments produce more segment results', () => {
    const r1 = makeResponse({ responseId: 'r1' });
    const r2 = makeResponse({
      responseId: 'r2',
      metadata: { department: 'Sales', role: 'Manager', location: 'Vancouver', tenure: '3-5 years' },
    });
    const result = computeSegmentedScores('survey-1', [r1, r2]);
    expect(result.overall.responseCount).toBe(2);
    // 2 departments + 2 roles + 2 locations + 2 tenures = 8 segments
    expect(result.segments.length).toBe(8);
  });
});
