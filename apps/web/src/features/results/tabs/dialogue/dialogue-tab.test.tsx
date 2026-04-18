import { describe, test, expect, mock, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { DialogueFilterContext } from '../../context/dialogue-filter-context';
import type { DialogueResponse, QuestionScoreRow } from '../../types';

/**
 * Component tests for DialogueTab — verifies it renders responses, filters
 * via search, and displays the "truncated results" affordance when the
 * useDialogueResponses hook reports hasMore (Wave 3.A item 7).
 *
 * Both data hooks are mocked at the module level so the tab can be rendered
 * in isolation without TanStack Query or Supabase.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

interface DialogueResponsesMock {
  data: DialogueResponse[] | undefined;
  isLoading: boolean;
  hasMore: boolean;
  cap: number;
}

let dialogueResponses: DialogueResponsesMock = {
  data: [],
  isLoading: false,
  hasMore: false,
  cap: 500,
};

let questionScores: QuestionScoreRow[] | undefined = [];

mock.module('../../hooks/use-dialogue-responses', () => ({
  useDialogueResponses: () => dialogueResponses,
  DIALOGUE_RESPONSES_CAP: 500,
}));

mock.module('../../hooks/use-question-scores', () => ({
  useQuestionScores: () => ({ data: questionScores, isLoading: false }),
}));

const { DialogueTab } = await import('./dialogue-tab.js');

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeResponses(count: number): DialogueResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `resp-${i}`,
    questionId: `q-${(i % 3) + 1}`,
    questionText: `Question ${(i % 3) + 1}`,
    responseText: `Response text number ${i} discussing collaboration and trust`,
    createdAt: new Date(2026, 0, i + 1).toISOString(),
  }));
}

function makeQuestionScores(): QuestionScoreRow[] {
  return [
    {
      questionId: 'q-1',
      questionText: 'Q1',
      dimensionCode: 'core',
      meanScore: 3.5,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 10, 5: 5 },
      responseCount: 15,
      isReverseScored: false,
      subDimensionCode: null,
      subDimensionName: null,
    },
  ];
}

function renderWithContext(): void {
  render(
    <DialogueFilterContext.Provider
      value={{ activeTopicId: null, setActiveTopicId: () => {}, topics: [] }}
    >
      <DialogueTab surveyId="survey-1" />
    </DialogueFilterContext.Provider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  dialogueResponses = { data: [], isLoading: false, hasMore: false, cap: 500 };
  questionScores = makeQuestionScores();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DialogueTab', () => {
  test('shows a skeleton while responses are loading', () => {
    dialogueResponses = { data: undefined, isLoading: true, hasMore: false, cap: 500 };
    const { container } = render(
      <DialogueFilterContext.Provider
        value={{ activeTopicId: null, setActiveTopicId: () => {}, topics: [] }}
      >
        <DialogueTab surveyId="survey-1" />
      </DialogueFilterContext.Provider>,
    );
    // Skeleton uses the pulse animation utility
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  test('shows empty-state when no responses were collected', () => {
    dialogueResponses = { data: [], isLoading: false, hasMore: false, cap: 500 };
    renderWithContext();
    expect(
      screen.getByText('No open-ended responses were collected in this survey.'),
    ).toBeTruthy();
  });

  test('renders a response card for each response', () => {
    dialogueResponses = {
      data: makeResponses(3),
      isLoading: false,
      hasMore: false,
      cap: 500,
    };
    renderWithContext();
    // The first 20 responses are rendered inline (page size = 20)
    expect(screen.getByText(/Response text number 0/)).toBeTruthy();
    expect(screen.getByText(/Response text number 1/)).toBeTruthy();
    expect(screen.getByText(/Response text number 2/)).toBeTruthy();
  });

  test('renders the search input with accessible label', () => {
    dialogueResponses = {
      data: makeResponses(3),
      isLoading: false,
      hasMore: false,
      cap: 500,
    };
    renderWithContext();
    const search = screen.getByLabelText('Search open-ended responses');
    expect(search).toBeTruthy();
  });

  test('displays the "truncated results" note when hasMore is true', () => {
    dialogueResponses = {
      data: makeResponses(5),
      isLoading: false,
      hasMore: true,
      cap: 500,
    };
    renderWithContext();
    const note = screen.getByRole('note');
    expect(note.textContent).toMatch(/most recent 500 responses/);
    expect(note.textContent).toMatch(/Older/);
  });

  test('does not show the truncation note when hasMore is false', () => {
    dialogueResponses = {
      data: makeResponses(3),
      isLoading: false,
      hasMore: false,
      cap: 500,
    };
    renderWithContext();
    expect(screen.queryByRole('note')).toBeNull();
  });

  test('shows a "Load more" button when responses exceed the 20-item page size', () => {
    dialogueResponses = {
      data: makeResponses(25),
      isLoading: false,
      hasMore: false,
      cap: 500,
    };
    renderWithContext();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeTruthy();
  });

  test('search input filters visible responses by text content', async () => {
    dialogueResponses = {
      data: [
        {
          id: 'r1',
          questionId: 'q-1',
          questionText: 'Q1',
          responseText: 'Unique keyword ZZZXX found here',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'r2',
          questionId: 'q-1',
          questionText: 'Q1',
          responseText: 'Different content without the marker',
          createdAt: '2026-01-02T00:00:00Z',
        },
        {
          id: 'r3',
          questionId: 'q-1',
          questionText: 'Q1',
          responseText: 'Third note mentioning QQQYY specifically',
          createdAt: '2026-01-03T00:00:00Z',
        },
      ],
      isLoading: false,
      hasMore: false,
      cap: 500,
    };
    renderWithContext();

    // Initial state: all three responses are visible.
    expect(screen.getByText(/Unique keyword ZZZXX/)).toBeTruthy();
    expect(screen.getByText(/Different content/)).toBeTruthy();
    expect(screen.getByText(/Third note mentioning QQQYY/)).toBeTruthy();

    const search = screen.getByLabelText('Search open-ended responses');
    // DialogueSearch wraps its onChange in a 300ms setTimeout. Use act to
    // satisfy React state-update batching in happy-dom, then waitFor with a
    // timeout greater than the debounce window to observe the filtered DOM.
    act(() => {
      fireEvent.change(search, { target: { value: 'ZZZXX' } });
    });

    await waitFor(
      () => {
        // Matching response remains in the DOM …
        expect(screen.queryByText(/Unique keyword ZZZXX/)).not.toBeNull();
        // … and both non-matching responses are removed.
        expect(screen.queryByText(/Different content/)).toBeNull();
        expect(screen.queryByText(/Third note mentioning QQQYY/)).toBeNull();
      },
      { timeout: 1500 },
    );

    // Local input value reflects what the user typed.
    expect((search as HTMLInputElement).value).toBe('ZZZXX');
  });
});
