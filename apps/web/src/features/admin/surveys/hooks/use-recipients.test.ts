import { describe, test, expect, mock, beforeEach } from 'bun:test';

/**
 * Tests for useRecipients, useRecipientStats, useAddRecipients,
 * useRemoveRecipient, and useSendInvitations hooks.
 *
 * Mocks @tanstack/react-query to capture options passed to useQuery/useMutation.
 * Mocks recipient-service to avoid real supabase calls.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let capturedQueryOpts: Record<string, unknown> | null = null;
let capturedMutationOpts: Record<string, unknown> | null = null;
const mockInvalidateQueries = mock(() => Promise.resolve());

mock.module('@tanstack/react-query', () => ({
  useQuery: (opts: Record<string, unknown>) => {
    capturedQueryOpts = opts;
    return { data: undefined, isLoading: true, error: null };
  },
  useMutation: (opts: Record<string, unknown>) => {
    capturedMutationOpts = opts;
    return { mutate: () => {}, isPending: false };
  },
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

const mockListRecipients = mock(() => Promise.resolve([]));
const mockAddRecipients = mock(() => Promise.resolve([]));
const mockRemoveRecipient = mock(() => Promise.resolve());
const mockGetRecipientStats = mock(() => Promise.resolve({ total: 0, pending: 0, invited: 0, completed: 0, bounced: 0 }));
const mockSendInvitations = mock(() => Promise.resolve({ sent: 0, failed: 0, errors: [] }));

mock.module('../services/recipient-service', () => ({
  listRecipients: mockListRecipients,
  addRecipients: mockAddRecipients,
  removeRecipient: mockRemoveRecipient,
  getRecipientStats: mockGetRecipientStats,
  sendInvitations: mockSendInvitations,
}));

const {
  useRecipients,
  useRecipientStats,
  useAddRecipients,
  useRemoveRecipient,
  useSendInvitations,
  recipientKeys,
} = await import('./use-recipients.js');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRecipients', () => {
  beforeEach(() => {
    capturedQueryOpts = null;
    capturedMutationOpts = null;
    mockInvalidateQueries.mockClear();
  });

  test('passes correct queryKey', () => {
    useRecipients('survey-1');
    expect(capturedQueryOpts!.queryKey).toEqual(['admin', 'recipients', 'list', 'survey-1']);
  });

  test('sets staleTime to 300000', () => {
    useRecipients('survey-1');
    expect(capturedQueryOpts!.staleTime).toBe(300000);
  });

  test('queryFn calls listRecipients', async () => {
    useRecipients('survey-1');
    const queryFn = capturedQueryOpts!.queryFn as () => Promise<unknown>;
    await queryFn();
    expect(mockListRecipients).toHaveBeenCalledWith('survey-1');
  });
});

describe('useRecipientStats', () => {
  beforeEach(() => {
    capturedQueryOpts = null;
  });

  test('passes correct queryKey', () => {
    useRecipientStats('survey-2');
    expect(capturedQueryOpts!.queryKey).toEqual(['admin', 'recipients', 'stats', 'survey-2']);
  });

  test('sets staleTime to 300000', () => {
    useRecipientStats('survey-2');
    expect(capturedQueryOpts!.staleTime).toBe(300000);
  });
});

describe('useAddRecipients', () => {
  beforeEach(() => {
    capturedMutationOpts = null;
    mockInvalidateQueries.mockClear();
  });

  test('invalidates list + stats keys on success', async () => {
    useAddRecipients();
    const onSuccess = capturedMutationOpts!.onSuccess as (data: unknown, vars: { surveyId: string }) => void;
    onSuccess([], { surveyId: 'survey-1' });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.list('survey-1') });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.stats('survey-1') });
  });
});

describe('useRemoveRecipient', () => {
  beforeEach(() => {
    capturedMutationOpts = null;
    mockInvalidateQueries.mockClear();
  });

  test('invalidates list + stats keys on success', async () => {
    useRemoveRecipient();
    const onSuccess = capturedMutationOpts!.onSuccess as (data: unknown, vars: { recipientId: string; surveyId: string }) => void;
    onSuccess(undefined, { recipientId: 'r-1', surveyId: 'survey-1' });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.list('survey-1') });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.stats('survey-1') });
  });
});

describe('useSendInvitations', () => {
  beforeEach(() => {
    capturedMutationOpts = null;
    mockInvalidateQueries.mockClear();
  });

  test('mutationFn calls sendInvitations', async () => {
    useSendInvitations();
    const mutationFn = capturedMutationOpts!.mutationFn as (vars: { surveyId: string; deploymentId: string }) => Promise<unknown>;
    await mutationFn({ surveyId: 'survey-1', deploymentId: 'dep-1' });
    expect(mockSendInvitations).toHaveBeenCalledWith('survey-1', 'dep-1');
  });

  test('invalidates on success', async () => {
    useSendInvitations();
    const onSuccess = capturedMutationOpts!.onSuccess as (data: unknown, vars: { surveyId: string; deploymentId: string }) => void;
    onSuccess({ sent: 5, failed: 0, errors: [] }, { surveyId: 'survey-1', deploymentId: 'dep-1' });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.list('survey-1') });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: recipientKeys.stats('survey-1') });
  });
});
