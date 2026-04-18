import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import type { LikertValue } from '@compass/types';
import { useAnswerStore } from '../stores/answer-store.js';

/**
 * Tests for useAnswerAutosave — verifies debounced flushing of the pending
 * queue to the server via adapter.upsertAnswer, that failing upserts re-queue
 * for retry (via the store), and that the debounce timer is cleared on
 * dependency change or unmount.
 *
 * setTimeout is collapsed to a microtask so the 300ms debounce and 1s-per-
 * retry backoff resolve effectively immediately.
 *
 * `spyOn` is used rather than `mock.module` — the latter is global in Bun
 * and leaks into other test files that import the real adapter module.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

const upsertCalls: Array<{ responseId: string; questionId: string; value: LikertValue | string }> = [];
let upsertStub: (
  responseId: string,
  questionId: string,
  value: LikertValue | string,
) => Promise<void> = async () => undefined;

const adapterModule = await import('../services/survey-engine-adapter.js');
const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      upsertAnswer: (responseId: string, questionId: string, value: LikertValue | string) => {
        upsertCalls.push({ responseId, questionId, value });
        return upsertStub(responseId, questionId, value);
      },
    }) as never,
);

afterAll(() => {
  createAdapterSpy.mockRestore();
});

const { useAnswerAutosave } = await import('./use-answer-autosave.js');

// ─── setTimeout patch ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout as any;

interface PendingTimer {
  id: number;
  cancelled: boolean;
  run: () => void;
}

let nextTimerId = 1;
let pendingTimers: PendingTimer[] = [];

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).setTimeout = ((handler: (...args: unknown[]) => void, _ms?: number, ...args: unknown[]) => {
    const id = nextTimerId++;
    const timer: PendingTimer = {
      id,
      cancelled: false,
      run: () => handler(...args),
    };
    pendingTimers.push(timer);
    // Schedule in microtask so React effects can settle first.
    Promise.resolve().then(() => {
      if (!timer.cancelled) timer.run();
    });
    return id as unknown as ReturnType<typeof setTimeout>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).clearTimeout = ((id: number) => {
    const timer = pendingTimers.find((t) => t.id === id);
    if (timer) timer.cancelled = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).setTimeout = ORIGINAL_SET_TIMEOUT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore(): void {
  useAnswerStore.setState({ answers: {}, pendingQueue: [], lastError: null });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useAnswerAutosave', () => {
  beforeEach(() => {
    upsertCalls.length = 0;
    upsertStub = async () => undefined;
    pendingTimers = [];
    resetStore();
  });

  afterEach(() => {
    // Unmount any hooks rendered in the previous test. Without explicit
    // cleanup, hook subscriptions to the shared zustand store persist and
    // react to state changes in later tests.
    cleanup();
    resetStore();
  });

  test('does nothing when responseId is undefined', async () => {
    await act(async () => {
      useAnswerStore.getState().setAnswer('q-1', 3);
    });

    renderHook(() => useAnswerAutosave(undefined));

    // Flush microtasks.
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(upsertCalls).toHaveLength(0);
    expect(useAnswerStore.getState().pendingQueue).toHaveLength(1);
  });

  test('does nothing when pending queue is empty', async () => {
    renderHook(() => useAnswerAutosave('resp-1'));

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(upsertCalls).toHaveLength(0);
  });

  test('flushes pending queue to the adapter after debounce', async () => {
    renderHook(() => useAnswerAutosave('resp-1'));

    await act(async () => {
      useAnswerStore.getState().setAnswer('q-1', 4);
      useAnswerStore.getState().setAnswer('q-2', 2);
    });

    await waitFor(() => expect(upsertCalls.length).toBe(2));

    const questionIds = upsertCalls.map((c) => c.questionId).sort();
    expect(questionIds).toEqual(['q-1', 'q-2']);
    expect(upsertCalls[0]?.responseId).toBe('resp-1');

    // Pending queue is drained on success.
    await waitFor(() => expect(useAnswerStore.getState().pendingQueue).toHaveLength(0));
  });

  test('failed upsert eventually surfaces an error in the store after 3 retries', async () => {
    upsertStub = async () => {
      throw new Error('network');
    };

    renderHook(() => useAnswerAutosave('resp-1'));

    await act(async () => {
      useAnswerStore.getState().setAnswer('q-1', 3);
    });

    // At least one attempt made.
    await waitFor(() => expect(upsertCalls.length).toBeGreaterThanOrEqual(1));

    // Eventually the store records a persistent error after 3 retries
    // (see answer-store.processPendingQueue). With our instant setTimeout
    // the retry loop converges quickly.
    await waitFor(() => {
      expect(useAnswerStore.getState().lastError).toContain('Failed');
    });
  });

  test('clears timer on unmount (no flush fires after unmount)', async () => {
    const { unmount } = renderHook(() => useAnswerAutosave('resp-1'));

    // Schedule a pending flush and unmount synchronously before microtasks
    // can flush — the hook's cleanup should cancel the pending timer.
    useAnswerStore.setState({
      pendingQueue: [{ questionId: 'q-1', value: 3, retryCount: 0 }],
      answers: { 'q-1': 3 },
      lastError: null,
    });
    // No act() — we want to unmount before React re-renders and effect runs.
    unmount();

    // Drain the microtask queue to be sure nothing fires late.
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(upsertCalls).toHaveLength(0);
  });

  test('uses the provided responseId when flushing', async () => {
    renderHook(() => useAnswerAutosave('resp-custom'));

    await act(async () => {
      useAnswerStore.getState().setAnswer('q-1', 5);
    });

    await waitFor(() => expect(upsertCalls.length).toBeGreaterThanOrEqual(1));
    expect(upsertCalls[0]?.responseId).toBe('resp-custom');
  });
});
