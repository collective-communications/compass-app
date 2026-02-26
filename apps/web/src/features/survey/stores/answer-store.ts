/**
 * Zustand store for local answer cache and pending sync queue.
 * Answers are stored locally for immediate UI feedback, then
 * flushed to the server via the pending queue with retry logic.
 */
import { create } from 'zustand';
import type { LikertValue, Question } from '@compass/types';

interface PendingItem {
  questionId: string;
  value: LikertValue | string;
  retryCount: number;
}

interface AnswerState {
  answers: Record<string, LikertValue | string>;
  pendingQueue: PendingItem[];
  lastError: string | null;

  /** Set an answer locally and enqueue it for server sync */
  setAnswer: (questionId: string, value: LikertValue | string) => void;

  /** Hydrate local cache from a resumed response */
  hydrateFromResponse: (existingAnswers: Record<string, LikertValue | string>) => void;

  /** Flush pending queue to server using the provided upsert function */
  processPendingQueue: (
    upsertFn: (questionId: string, value: LikertValue | string) => Promise<void>,
  ) => Promise<void>;

  /** Returns indices of answered questions for progress squares */
  getAnsweredIndices: (questions: Question[]) => Set<number>;

  /** Clear the last error */
  clearError: () => void;
}

export const useAnswerStore = create<AnswerState>((set, get) => ({
  answers: {},
  pendingQueue: [],
  lastError: null,

  setAnswer(questionId, value) {
    set((state) => ({
      answers: { ...state.answers, [questionId]: value },
      pendingQueue: [
        ...state.pendingQueue.filter((item) => item.questionId !== questionId),
        { questionId, value, retryCount: 0 },
      ],
      lastError: null,
    }));
  },

  hydrateFromResponse(existingAnswers) {
    set({ answers: { ...existingAnswers }, pendingQueue: [], lastError: null });
  },

  async processPendingQueue(upsertFn) {
    const { pendingQueue } = get();
    if (pendingQueue.length === 0) return;

    const remaining: PendingItem[] = [];

    for (const item of pendingQueue) {
      try {
        await upsertFn(item.questionId, item.value);
      } catch {
        if (item.retryCount < 3) {
          remaining.push({ ...item, retryCount: item.retryCount + 1 });
        } else {
          set({ lastError: `Failed to save answer for question after 3 retries.` });
        }
      }
    }

    set({ pendingQueue: remaining });
  },

  getAnsweredIndices(questions) {
    const { answers } = get();
    const indices = new Set<number>();
    questions.forEach((q, i) => {
      if (answers[q.id] !== undefined) {
        indices.add(i);
      }
    });
    return indices;
  },

  clearError() {
    set({ lastError: null });
  },
}));
