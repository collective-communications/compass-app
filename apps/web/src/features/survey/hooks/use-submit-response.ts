/**
 * Hook for submitting a completed survey response.
 * Flushes pending answers, optionally upserts open-ended text,
 * calls submitResponse to set completed_at, and marks the session as completed.
 * Retries with exponential backoff on failure.
 */
import { useCallback, useRef, useState } from 'react';
import { useAnswerStore } from '../stores/answer-store';
import { SessionCookieManager } from '../lib/session-cookie';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

/** Parameters for the submit function */
export interface SubmitParams {
  responseId: string;
  deploymentId: string;
  /** Open-ended feedback text. Omit or pass empty string to skip. */
  openEndedText?: string;
  /** Question ID for the open-ended question, required if openEndedText is provided. */
  openEndedQuestionId?: string;
}

export interface UseSubmitResponseReturn {
  submit: (params: SubmitParams) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

/** Delay helper that resolves after the given milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Provides a submit function that finalizes the survey response.
 * Handles answer flushing, open-ended upsert, submission, and session marking
 * with exponential backoff retry (5 attempts: 1s, 2s, 4s, 8s, 16s).
 */
export function useSubmitResponse(): UseSubmitResponseReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapterRef = useRef(createSurveyEngineAdapter());

  const submit = useCallback(async (params: SubmitParams): Promise<void> => {
    setIsPending(true);
    setError(null);

    const adapter = adapterRef.current;

    try {
      // 1. Flush any pending answers from the store
      const { processPendingQueue } = useAnswerStore.getState();
      await processPendingQueue((questionId, value) =>
        adapter.upsertAnswer(params.responseId, questionId, value),
      );

      // 2. Upsert open-ended answer if provided
      if (params.openEndedText && params.openEndedQuestionId) {
        await adapter.upsertAnswer(
          params.responseId,
          params.openEndedQuestionId,
          params.openEndedText,
        );
      }

      // 3. Submit with retry
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          await adapter.submitResponse(params.responseId);
          // Success — mark session completed and return
          SessionCookieManager.markCompleted(params.deploymentId);
          return;
        } catch (err) {
          lastError = err;
          if (attempt < MAX_ATTEMPTS - 1) {
            await delay(BASE_DELAY_MS * Math.pow(2, attempt));
          }
        }
      }

      throw lastError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit survey.';
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { submit, isPending, error };
}
