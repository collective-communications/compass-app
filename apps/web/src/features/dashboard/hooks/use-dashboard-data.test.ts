import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import type { AuthUser, UserRole as UserRoleType } from '@compass/types';
import { UserRole } from '@compass/types';

/**
 * Tests for useDashboardData — Wave 1.1's split-query behaviour.
 *
 * The hook now:
 *   - always runs the surveys+deployments query (allowed for every role),
 *   - only runs the responses count query when role starts with `ccc_`,
 *   - returns `responseCount: number | null` per row (null for client_*).
 *
 * The chain mock captures which tables were hit so we can assert that
 * `responses` is NEVER touched for client_* roles.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  error: null | { code?: string; message: string; hint?: string | null };
  count?: number | null;
}

interface FromCall {
  table: string;
}

let surveysResult: MockResult = { data: [], error: null };
let responsesResult: MockResult = { data: [], error: null, count: 0 };
const fromCalls: FromCall[] = [];
let countsPerSurvey: Map<string, number> = new Map();

function makeSurveysChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.order = () => Promise.resolve(surveysResult);
  return chain;
}

function makeResponsesChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  chain.select = () => chain;
  chain.eq = (_col: unknown, surveyId: unknown): Promise<MockResult> => {
    if (responsesResult.error) {
      return Promise.resolve(responsesResult);
    }
    const count = countsPerSurvey.get(String(surveyId)) ?? responsesResult.count ?? 0;
    return Promise.resolve({ data: null, error: null, count });
  };
  return chain;
}

mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      fromCalls.push({ table });
      if (table === 'responses') return makeResponsesChain();
      return makeSurveysChain();
    },
  },
}));

// Drive the role via the auth store — hook subscribes with a selector.
const { useAuthStore } = await import('../../../stores/auth-store');

function setRole(role: UserRoleType | undefined): void {
  if (role === undefined) {
    useAuthStore.setState({ user: null, session: null });
    return;
  }
  const user: AuthUser = {
    id: 'u-1',
    email: `${role}@example.com`,
    fullName: 'Test',
    avatarUrl: null,
    role,
    organizationId: 'org-1',
    tier: role === UserRole.CCC_ADMIN || role === UserRole.CCC_MEMBER ? 'tier_1' : 'tier_2',
  };
  useAuthStore.setState({
    user,
    session: { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 1e7, user },
  });
}

const { useDashboardData } = await import('./use-dashboard-data.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(): (props: PropsWithChildren) => ReactElement {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeSurveyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'survey-1',
    organization_id: 'org-1',
    title: 'Culture Pulse Q1',
    description: null,
    status: 'active',
    opens_at: '2026-01-01',
    closes_at: '2099-12-31',
    settings: null,
    scores_calculated: false,
    scores_calculated_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    created_by: 'ccc-1',
    deployments: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useDashboardData', () => {
  beforeEach(() => {
    surveysResult = { data: [], error: null };
    responsesResult = { data: [], error: null, count: 0 };
    fromCalls.length = 0;
    countsPerSurvey = new Map();
  });

  test('ccc_admin with one active survey + 5 responses → response count populated', async () => {
    setRole(UserRole.CCC_ADMIN);
    surveysResult = {
      data: [makeSurveyRow({ id: 'survey-A', deployments: [{ id: 'd1', survey_id: 'survey-A', type: 'anonymous_link', token: 'tok', closes_at: null, access_count: 0, last_accessed_at: null, created_at: '2026-01-01', max_responses: 20 }] })],
      error: null,
    };
    countsPerSurvey.set('survey-A', 5);

    const { result } = renderHook(
      () => useDashboardData({ organizationId: 'org-1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.activeSurvey).not.toBeNull();
    expect(result.current.activeSurvey!.responseCount).toBe(5);
    expect(result.current.activeSurvey!.expectedCount).toBe(20);
    expect(result.current.activeSurvey!.completionPercent).toBe(25);
    // responses table MUST have been consulted for ccc_admin
    expect(fromCalls.some((c) => c.table === 'responses')).toBe(true);
  });

  test('client_exec with same data → responseCount is null, no error, no `responses` query', async () => {
    setRole(UserRole.CLIENT_EXEC);
    surveysResult = {
      data: [makeSurveyRow({ id: 'survey-A' })],
      error: null,
    };
    // Deliberately provide a count that SHOULD NOT appear in the result.
    countsPerSurvey.set('survey-A', 99);

    const { result } = renderHook(
      () => useDashboardData({ organizationId: 'org-1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.activeSurvey).not.toBeNull();
    expect(result.current.activeSurvey!.responseCount).toBeNull();
    // responses RLS blocks client_*; the hook must skip that query entirely.
    expect(fromCalls.some((c) => c.table === 'responses')).toBe(false);
  });

  test('client_user with zero surveys → empty lists, no error', async () => {
    setRole(UserRole.CLIENT_USER);
    surveysResult = { data: [], error: null };

    const { result } = renderHook(
      () => useDashboardData({ organizationId: 'org-1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.activeSurvey).toBeNull();
    expect(result.current.previousSurveys).toEqual([]);
  });

  test('orphan user (organizationId=null) → hook stays disabled, no surveys, no error', async () => {
    setRole(UserRole.CLIENT_USER);

    const { result } = renderHook(
      () => useDashboardData({ organizationId: null }),
      { wrapper: makeWrapper() },
    );

    // With `enabled: false` (no orgId), TanStack Query stays idle — give it
    // a tick then assert the hook returns the empty shape without throwing.
    await waitFor(() => {
      expect(result.current.activeSurvey).toBeNull();
      expect(result.current.previousSurveys).toEqual([]);
    });

    expect(result.current.error).toBeNull();
    // The fetcher must not have been called for a null orgId.
    expect(fromCalls).toHaveLength(0);
  });

  test('surveys query error → surfaces a human-readable Error (not [object Object])', async () => {
    setRole(UserRole.CCC_ADMIN);
    surveysResult = {
      data: null,
      error: { code: 'PGRST116', message: 'boom', hint: null },
    };

    const { result } = renderHook(
      () => useDashboardData({ organizationId: 'org-1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('boom');
    // Guardrail: the [object Object] stringification regression must not return.
    expect(result.current.error!.message).not.toContain('[object Object]');
  });

  test('refetch re-invokes the underlying query', async () => {
    setRole(UserRole.CCC_ADMIN);
    surveysResult = { data: [], error: null };

    const { result } = renderHook(
      () => useDashboardData({ organizationId: 'org-1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = fromCalls.length;
    expect(callsBefore).toBeGreaterThan(0);

    result.current.refetch();

    await waitFor(() => expect(fromCalls.length).toBeGreaterThan(callsBefore));
  });
});
