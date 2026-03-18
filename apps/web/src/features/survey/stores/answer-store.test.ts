import { describe, expect, test, beforeEach } from 'bun:test';
import { useAnswerStore } from './answer-store';
import type { Question } from '@compass/types';

/** Reset the store to its initial state before each test. */
function resetStore(): void {
  useAnswerStore.setState({
    answers: {},
    pendingQueue: [],
    lastError: null,
  });
}

/** Build a minimal Question stub for getAnsweredIndices tests. */
function makeQuestion(id: string): Question {
  return {
    id,
    surveyId: 'survey-1',
    text: `Question ${id}`,
    description: null,
    type: 'likert',
    reverseScored: false,
    options: null,
    required: true,
    displayOrder: 0,
    subDimensionId: null,
    diagnosticFocus: null,
    recommendedAction: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

describe('useAnswerStore', () => {
  beforeEach(resetStore);

  // ── setAnswer ──────────────────────────────────────────────────────────────

  test('setAnswer stores an answer correctly', () => {
    useAnswerStore.getState().setAnswer('q-1', 4);

    const { answers } = useAnswerStore.getState();
    expect(answers['q-1']).toBe(4);
  });

  test('setAnswer adds to pending queue', () => {
    useAnswerStore.getState().setAnswer('q-1', 3);

    const { pendingQueue } = useAnswerStore.getState();
    expect(pendingQueue).toHaveLength(1);
    expect(pendingQueue[0]).toEqual({ questionId: 'q-1', value: 3, retryCount: 0 });
  });

  test('setAnswer deduplicates pending queue — same questionId replaces', () => {
    const { setAnswer } = useAnswerStore.getState();
    setAnswer('q-1', 2);
    setAnswer('q-1', 5);

    const { pendingQueue } = useAnswerStore.getState();
    expect(pendingQueue).toHaveLength(1);
    expect(pendingQueue[0]!.value).toBe(5);
    expect(pendingQueue[0]!.retryCount).toBe(0);
  });

  test('setAnswer clears lastError', () => {
    useAnswerStore.setState({ lastError: 'previous error' });
    useAnswerStore.getState().setAnswer('q-1', 3);

    expect(useAnswerStore.getState().lastError).toBeNull();
  });

  // ── hydrateFromResponse ────────────────────────────────────────────────────

  test('hydrateFromResponse populates answers from response data', () => {
    const existing = { 'q-1': 4, 'q-2': 2, 'q-3': 'Some open text' };
    useAnswerStore.getState().hydrateFromResponse(existing);

    const { answers, pendingQueue, lastError } = useAnswerStore.getState();
    expect(answers).toEqual(existing);
    expect(pendingQueue).toHaveLength(0);
    expect(lastError).toBeNull();
  });

  test('hydrateFromResponse resets pending queue and error', () => {
    // Seed some state first
    useAnswerStore.setState({
      pendingQueue: [{ questionId: 'q-1', value: 1, retryCount: 2 }],
      lastError: 'stale error',
    });

    useAnswerStore.getState().hydrateFromResponse({ 'q-10': 3 });

    const { pendingQueue, lastError } = useAnswerStore.getState();
    expect(pendingQueue).toHaveLength(0);
    expect(lastError).toBeNull();
  });

  // ── getAnsweredIndices ─────────────────────────────────────────────────────

  test('getAnsweredIndices returns correct set', () => {
    const questions: Question[] = [
      makeQuestion('q-a'),
      makeQuestion('q-b'),
      makeQuestion('q-c'),
    ];

    useAnswerStore.setState({ answers: { 'q-a': 3, 'q-c': 1 } });

    const indices = useAnswerStore.getState().getAnsweredIndices(questions);
    expect(indices.has(0)).toBe(true);
    expect(indices.has(1)).toBe(false);
    expect(indices.has(2)).toBe(true);
    expect(indices.size).toBe(2);
  });

  test('getAnsweredIndices returns empty set when no answers', () => {
    const questions: Question[] = [makeQuestion('q-a'), makeQuestion('q-b')];

    const indices = useAnswerStore.getState().getAnsweredIndices(questions);
    expect(indices.size).toBe(0);
  });

  // ── clearError ─────────────────────────────────────────────────────────────

  test('clearError resets lastError', () => {
    useAnswerStore.setState({ lastError: 'something went wrong' });

    useAnswerStore.getState().clearError();
    expect(useAnswerStore.getState().lastError).toBeNull();
  });

  test('clearError is a no-op when lastError is already null', () => {
    useAnswerStore.getState().clearError();
    expect(useAnswerStore.getState().lastError).toBeNull();
  });
});
