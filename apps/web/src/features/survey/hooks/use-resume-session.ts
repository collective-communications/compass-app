/**
 * Hook to detect and resume an existing survey session.
 * Checks for a device-bound session cookie and loads the
 * corresponding response from the server if one exists.
 */
import { useEffect, useState } from 'react';
import type { SurveyResponse } from '@compass/types';
import { SessionCookieManager } from '../lib/session-cookie';
import { createSurveyEngineAdapter } from '../services/survey-engine-adapter';

export interface ResumeSessionResult {
  /** Whether a valid session cookie exists for this deployment */
  hasSession: boolean;
  /** The resumed response, or null if no prior response found */
  response: SurveyResponse | null;
  /** Number of questions already answered in the response */
  answeredCount: number;
  /** 1-based index of the first unanswered question */
  resumeIndex: number;
  /** Whether the session check is still in progress */
  isLoading: boolean;
  /** Whether the session was already completed */
  isCompleted: boolean;
}

const INITIAL_STATE: ResumeSessionResult = {
  hasSession: false,
  response: null,
  answeredCount: 0,
  resumeIndex: 1,
  isLoading: true,
  isCompleted: false,
};

/**
 * Check for an existing survey session and load the response if found.
 * Returns resume metadata so the caller can show the welcome-back screen
 * or redirect to completion.
 */
export function useResumeSession(
  deploymentId: string,
  surveyId: string,
  totalQuestions: number,
): ResumeSessionResult {
  const [state, setState] = useState<ResumeSessionResult>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<void> {
      // Check for completed session first
      if (SessionCookieManager.isCompleted(deploymentId)) {
        if (!cancelled) {
          setState({
            hasSession: true,
            response: null,
            answeredCount: 0,
            resumeIndex: 1,
            isLoading: false,
            isCompleted: true,
          });
        }
        return;
      }

      // Check for existing session token
      const sessionToken = SessionCookieManager.getSession(deploymentId);
      if (!sessionToken) {
        if (!cancelled) {
          setState({ ...INITIAL_STATE, isLoading: false });
        }
        return;
      }

      // Session exists — try to resume from server
      try {
        const adapter = createSurveyEngineAdapter();
        const response = await adapter.resumeResponse(deploymentId, sessionToken);

        if (cancelled) return;

        if (!response || !response.answers) {
          // Orphaned cookie — treat as new session
          setState({ ...INITIAL_STATE, isLoading: false });
          return;
        }

        const answeredCount = Object.keys(response.answers).length;

        if (answeredCount === 0) {
          // Response exists but no answers — treat as new
          setState({
            hasSession: true,
            response,
            answeredCount: 0,
            resumeIndex: 1,
            isLoading: false,
            isCompleted: false,
          });
          return;
        }

        // Calculate resumeIndex: 1-based index of first unanswered question.
        // Since we don't have the question order here, use answeredCount + 1
        // as a best approximation. The caller should refine this using the
        // actual question list if sequential ordering applies.
        const resumeIndex = Math.min(answeredCount + 1, totalQuestions);

        setState({
          hasSession: true,
          response,
          answeredCount,
          resumeIndex,
          isLoading: false,
          isCompleted: false,
        });
      } catch {
        // Network error or unexpected failure — treat as no session
        if (!cancelled) {
          setState({ ...INITIAL_STATE, isLoading: false });
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [deploymentId, surveyId, totalQuestions]);

  return state;
}
