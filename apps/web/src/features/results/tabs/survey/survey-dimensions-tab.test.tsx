import { describe, test, expect, mock, afterEach, beforeEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { DimensionContext } from '../../context/dimension-context';
import type { QuestionScoreRow } from '../../types';
import type { DimensionScoreMap } from '@compass/scoring';

/**
 * Component tests for SurveyDimensionsTab — verifies the dimension header
 * card renders with the correct dimension, sub-dimension rows appear when
 * question rows carry sub-dimension metadata, and question result cards
 * are rendered one per question.
 */

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let questionsResult: { data: QuestionScoreRow[] | undefined; isLoading: boolean } = {
  data: [],
  isLoading: false,
};

let overallScoresResult: { data: DimensionScoreMap | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};

mock.module('../../hooks/use-question-scores', () => ({
  useQuestionScores: () => questionsResult,
}));

mock.module('../../hooks/use-overall-scores', () => ({
  useOverallScores: () => overallScoresResult,
}));

const { SurveyDimensionsTab } = await import('./survey-dimensions-tab.js');

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeOverallScores(): DimensionScoreMap {
  return {
    core: { dimensionId: 'core', dimensionCode: 'core', score: 72, rawScore: 3.9, responseCount: 42 },
    clarity: { dimensionId: 'clarity', dimensionCode: 'clarity', score: 61, rawScore: 3.45, responseCount: 42 },
    connection: { dimensionId: 'connection', dimensionCode: 'connection', score: 55, rawScore: 3.2, responseCount: 42 },
    collaboration: { dimensionId: 'collaboration', dimensionCode: 'collaboration', score: 48, rawScore: 2.9, responseCount: 42 },
  };
}

function makeQuestions(): QuestionScoreRow[] {
  return [
    {
      questionId: 'q-1',
      questionText: 'Do you feel safe speaking up in meetings?',
      dimensionCode: 'core',
      meanScore: 4.1,
      distribution: { 1: 0, 2: 1, 3: 3, 4: 8, 5: 4 },
      responseCount: 16,
      isReverseScored: false,
      subDimensionCode: 'psych_safety',
      subDimensionName: 'Psychological Safety',
    },
    {
      questionId: 'q-2',
      questionText: 'Leadership communicates changes clearly.',
      dimensionCode: 'core',
      meanScore: 3.5,
      distribution: { 1: 1, 2: 2, 3: 5, 4: 5, 5: 3 },
      responseCount: 16,
      isReverseScored: false,
      subDimensionCode: 'trust',
      subDimensionName: 'Trust',
    },
  ];
}

function renderTab(active: 'overview' | 'core' | 'clarity' | 'connection' | 'collaboration' = 'core'): void {
  render(
    <DimensionContext.Provider value={{ activeDimension: active, setActiveDimension: () => {} }}>
      <SurveyDimensionsTab surveyId="survey-1" />
    </DimensionContext.Provider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  questionsResult = { data: makeQuestions(), isLoading: false };
  overallScoresResult = { data: makeOverallScores(), isLoading: false };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SurveyDimensionsTab', () => {
  test('renders loading skeleton while questions are loading', () => {
    questionsResult = { data: undefined, isLoading: true };
    const { container } = render(
      <DimensionContext.Provider value={{ activeDimension: 'core', setActiveDimension: () => {} }}>
        <SurveyDimensionsTab surveyId="survey-1" />
      </DimensionContext.Provider>,
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  test('renders dimension header card with the active dimension name', () => {
    renderTab('core');
    // "Core" is the dimension label from @compass/tokens
    expect(screen.getByText('Core')).toBeTruthy();
  });

  test('shows the dimension score in the header', () => {
    renderTab('core');
    // Score 72 from the mocked overallScores map (rounded display)
    const body = screen.getByText(/Overall score:/);
    expect(body.textContent).toContain('72');
  });

  test('renders one card per question', () => {
    renderTab('core');
    expect(screen.getByText('Do you feel safe speaking up in meetings?')).toBeTruthy();
    expect(screen.getByText('Leadership communicates changes clearly.')).toBeTruthy();
  });

  test('renders a Sub-dimensions section when questions carry sub-dimension metadata', () => {
    renderTab('core');
    expect(screen.getByText('Sub-dimensions')).toBeTruthy();
    // Sub-dimension display names are title-cased by the component
    expect(screen.getAllByText(/Psych Safety/).length).toBeGreaterThan(0);
    // "Trust" appears multiple times (e.g. in sub-dim label + question text); just assert it's present.
    expect(screen.getAllByText(/Trust/).length).toBeGreaterThan(0);
  });

  test('omits Sub-dimensions section when no question has subDimensionCode', () => {
    questionsResult = {
      data: makeQuestions().map((q) => ({ ...q, subDimensionCode: null, subDimensionName: null })),
      isLoading: false,
    };
    renderTab('core');
    expect(screen.queryByText('Sub-dimensions')).toBeNull();
  });

  test('defaults to the "core" dimension when activeDimension is "overview"', () => {
    renderTab('overview');
    // Still shows Core since overview falls back to core per the source
    expect(screen.getByText('Core')).toBeTruthy();
  });

  test('sub-dimension rows have accessible progressbar roles', () => {
    renderTab('core');
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThanOrEqual(2);
    // Each bar should have a label matching the sub-dimension
    const labels = bars.map((b) => b.getAttribute('aria-label') ?? '');
    expect(labels.some((l) => l.includes('Psych Safety'))).toBe(true);
    expect(labels.some((l) => l.includes('Trust'))).toBe(true);
  });
});
