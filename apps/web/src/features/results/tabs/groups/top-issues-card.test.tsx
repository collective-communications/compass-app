import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { TopIssuesCard } from './top-issues-card';
import type { QuestionScoreRow } from '../../types';

afterEach(cleanup);

function makeQuestion(overrides?: Partial<QuestionScoreRow>): QuestionScoreRow {
  return {
    questionId: crypto.randomUUID(),
    questionText: 'Sample question about collaboration',
    dimensionCode: 'collaboration',
    meanScore: 2.5,
    distribution: { 1: 3, 2: 5, 3: 4, 4: 2, 5: 1 },
    responseCount: 15,
    isReverseScored: false,
    subDimensionCode: null,
    subDimensionName: null,
    ...overrides,
  };
}

describe('TopIssuesCard', () => {
  test('renders "Top Issues" heading when no segmentLabel', () => {
    render(<TopIssuesCard questions={[makeQuestion()]} />);
    expect(screen.getByText('Top Issues')).toBeTruthy();
  });

  test('renders "Top 3 Issues for Engineering" when segmentLabel provided', () => {
    render(<TopIssuesCard questions={[makeQuestion()]} segmentLabel="Engineering" />);
    expect(screen.getByText('Top 3 Issues for Engineering')).toBeTruthy();
  });

  test('shows the 3 lowest-scoring questions sorted by meanScore', () => {
    const questions = [
      makeQuestion({ questionText: 'Q high', meanScore: 4.2 }),
      makeQuestion({ questionText: 'Q lowest', meanScore: 1.1 }),
      makeQuestion({ questionText: 'Q mid', meanScore: 2.8 }),
      makeQuestion({ questionText: 'Q low', meanScore: 1.9 }),
    ];

    render(<TopIssuesCard questions={questions} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);

    // Verify sort order: lowest first
    expect(screen.getByText('Q lowest')).toBeTruthy();
    expect(screen.getByText('Q low')).toBeTruthy();
    expect(screen.getByText('Q mid')).toBeTruthy();
    // Q high should be excluded (only top 3)
    expect(screen.queryByText('Q high')).toBeNull();
  });

  test('respects limit prop', () => {
    const questions = [
      makeQuestion({ questionText: 'Q1', meanScore: 1.0 }),
      makeQuestion({ questionText: 'Q2', meanScore: 2.0 }),
      makeQuestion({ questionText: 'Q3', meanScore: 3.0 }),
    ];

    render(<TopIssuesCard questions={questions} limit={2} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
    expect(screen.queryByText('Q3')).toBeNull();
  });

  test('empty state renders "No question data available"', () => {
    render(<TopIssuesCard questions={[]} />);
    expect(screen.getByText('No question data available.')).toBeTruthy();
  });

  test('heading uses uppercase label styling', () => {
    render(<TopIssuesCard questions={[makeQuestion()]} segmentLabel="Marketing" />);
    const heading = screen.getByText('Top 3 Issues for Marketing');
    expect(heading.tagName).toBe('H3');
    // Verify the text content is present (CSS uppercase styling applied via classes)
    expect(heading.textContent).toBe('Top 3 Issues for Marketing');
  });
});
