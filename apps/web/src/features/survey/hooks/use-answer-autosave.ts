/**
 * Debounced autosave hook for survey answers.
 * Watches the pending queue in the answer store and flushes
 * to the server after 300ms of inactivity, with retry logic.
 */
import { useEffect, useRef } from 'react';
import { useAnswerStore } from '../stores/answer-store';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const adapter = createSurveyEngineAdapter();
const DEBOUNCE_MS = 300;
const RETRY_BACKOFF_MS = 1000;

/**
 * Watches the answer store's pending queue and auto-saves
 * answers to the server with debouncing and retry.
 */
export function useAnswerAutosave(responseId: string | undefined): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueue = useAnswerStore((s) => s.pendingQueue);
  const processPendingQueue = useAnswerStore((s) => s.processPendingQueue);

  useEffect(() => {
    if (!responseId || pendingQueue.length === 0) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      const maxRetry = Math.max(...pendingQueue.map((item) => item.retryCount));
      const backoff = maxRetry > 0 ? RETRY_BACKOFF_MS * maxRetry : 0;

      if (backoff > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, backoff));
      }

      await processPendingQueue(async (questionId, value) => {
        await adapter.upsertAnswer(responseId, questionId, value);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [responseId, pendingQueue, processPendingQueue]);
}
