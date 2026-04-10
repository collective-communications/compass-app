import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { RecommendedActionCard } from './recommended-action-card';
import type { Recommendation } from '../../types';

afterEach(cleanup);

const mockRecommendation: Recommendation = {
  id: 'rec-1',
  dimensionCode: 'collaboration',
  severity: 'high',
  title: 'Schedule cross-team collaboration workshop',
  body: 'Focus on Engineering + Product + Design alignment to address collaboration silos.',
  actions: ['Book facilitator', 'Set 2-week cadence', 'Include retrospective'],
  cccServiceLink: null,
  trustLadderLink: null,
  priority: 1,
};

describe('RecommendedActionCard', () => {
  test('renders "Recommended Action" section heading when recommendation provided', () => {
    render(<RecommendedActionCard recommendation={mockRecommendation} />);
    expect(screen.getByText('Recommended Action')).toBeTruthy();
  });

  test('renders "Targeted Intervention" label', () => {
    render(<RecommendedActionCard recommendation={mockRecommendation} />);
    expect(screen.getByText('Targeted Intervention')).toBeTruthy();
  });

  test('shows recommendation title', () => {
    render(<RecommendedActionCard recommendation={mockRecommendation} />);
    expect(
      screen.getByText('Schedule cross-team collaboration workshop'),
    ).toBeTruthy();
  });

  test('shows recommendation body text', () => {
    render(<RecommendedActionCard recommendation={mockRecommendation} />);
    expect(
      screen.getByText(
        'Focus on Engineering + Product + Design alignment to address collaboration silos.',
      ),
    ).toBeTruthy();
  });

  test('returns null when recommendation is null', () => {
    const { container } = render(
      <RecommendedActionCard recommendation={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('card has green border styling', () => {
    const { container } = render(
      <RecommendedActionCard recommendation={mockRecommendation} />,
    );
    expect(container.innerHTML).toContain('--severity-healthy-border');
  });
});
