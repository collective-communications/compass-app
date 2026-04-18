import { describe, test, expect, beforeEach, afterAll, spyOn } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { SurveyResponse } from '@compass/types';

/**
 * Tests for useResumeSession — exercises the three branches:
 *   1. Completed cookie → `isCompleted: true`
 *   2. No session cookie → `hasSession: false, isLoading: false`
 *   3. Session cookie + server hit → resumed response with answeredCount
 *
 * Both SessionCookieManager and the survey-engine adapter are spied-on
 * via `spyOn` (not mock.module, which is global and leaks across files).
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

const sessionCookieModule = await import('../lib/session-cookie.js');
const adapterModule = await import('../services/survey-engine-adapter.js');

let getSessionStub: (deploymentId: string) => string | null = () => null;
let isCompletedStub: (deploymentId: string) => boolean = () => false;

const getSessionSpy = spyOn(sessionCookieModule.SessionCookieManager, 'getSession');
getSessionSpy.mockImplementation((deploymentId: string) => getSessionStub(deploymentId));

const isCompletedSpy = spyOn(sessionCookieModule.SessionCookieManager, 'isCompleted');
isCompletedSpy.mockImplementation((deploymentId: string) => isCompletedStub(deploymentId));

let resumeResponseStub: (
  deploymentId: string,
  sessionToken: string,
) => Promise<SurveyResponse | null> = async () => null;

const createAdapterSpy = spyOn(adapterModule, 'createSurveyEngineAdapter');
createAdapterSpy.mockImplementation(
  () =>
    ({
      resumeResponse: (deploymentId: string, sessionToken: string) =>
        resumeResponseStub(deploymentId, sessionToken),
    }) as never,
);

afterAll(() => {
  getSessionSpy.mockRestore();
  isCompletedSpy.mockRestore();
  createAdapterSpy.mockRestore();
});

const { useResumeSession } = await import('./use-resume-session.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResponse(answers: Record<string, number>): SurveyResponse {
  return {
    id: 'session-token-1',
    surveyId: '',
    deploymentId: 'dep-1',
    answers,
    metadata: { department: '', role: '', location: '', tenure: '' },
    completedAt: null,
    ipHash: null,
    userAgent: null,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useResumeSession', () => {
  beforeEach(() => {
    getSessionStub = () => null;
    isCompletedStub = () => false;
    resumeResponseStub = async () => null;
  });

  test('marks state as completed when completion cookie is present', async () => {
    isCompletedStub = () => true;

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.hasSession).toBe(true);
  });

  test('returns fresh-start state when no session cookie exists', async () => {
    getSessionStub = () => null;
    isCompletedStub = () => false;

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSession).toBe(false);
    expect(result.current.response).toBeNull();
    expect(result.current.answeredCount).toBe(0);
    expect(result.current.resumeIndex).toBe(1);
  });

  test('resumes an in-progress response with accurate answeredCount', async () => {
    getSessionStub = () => 'session-token-1';
    resumeResponseStub = async () => makeResponse({ 'q-1': 3, 'q-2': 5, 'q-3': 2 });

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSession).toBe(true);
    expect(result.current.answeredCount).toBe(3);
    expect(result.current.resumeIndex).toBe(4);
    expect(result.current.response).not.toBeNull();
  });

  test('caps resumeIndex at totalQuestions', async () => {
    getSessionStub = () => 'session-token-1';
    resumeResponseStub = async () =>
      makeResponse({ 'q-1': 5, 'q-2': 5, 'q-3': 5, 'q-4': 5, 'q-5': 5 });

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 5));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.answeredCount).toBe(5);
    expect(result.current.resumeIndex).toBe(5);
  });

  test('treats orphaned cookie (null response) as fresh start', async () => {
    getSessionStub = () => 'session-token-orphan';
    resumeResponseStub = async () => null;

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSession).toBe(false);
    expect(result.current.response).toBeNull();
  });

  test('treats response-with-zero-answers as resumable but at index 1', async () => {
    getSessionStub = () => 'session-token-1';
    resumeResponseStub = async () => makeResponse({});

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSession).toBe(true);
    expect(result.current.answeredCount).toBe(0);
    expect(result.current.resumeIndex).toBe(1);
  });

  test('treats adapter error as fresh start (no crash)', async () => {
    getSessionStub = () => 'session-token-1';
    resumeResponseStub = async () => {
      throw new Error('network fail');
    };

    const { result } = renderHook(() => useResumeSession('dep-1', 'survey-1', 20));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSession).toBe(false);
    expect(result.current.response).toBeNull();
  });
});
