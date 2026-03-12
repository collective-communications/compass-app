import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { RecommendationCard } from './recommendation-card';

afterEach(cleanup);

describe('RecommendationCard', () => {
  const defaultProps = {
    title: 'Improve Communication',
    description: 'Focus on transparent messaging',
    severity: 'high' as const,
    dimension: 'Clarity',
    actions: ['Hold weekly town halls', 'Create feedback channels', 'Publish meeting notes'],
  };

  test('renders title and description', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(screen.getByText('Improve Communication')).toBeTruthy();
    expect(screen.getByText('Focus on transparent messaging')).toBeTruthy();
  });

  test('renders numbered action items in an ordered list', () => {
    render(<RecommendationCard {...defaultProps} />);
    const list = screen.getByRole('list');
    expect(list).toBeTruthy();
    expect(list.tagName).toBe('OL');

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('Hold weekly town halls');
  });

  test('has aria-live region for dynamic updates', () => {
    const { container } = render(<RecommendationCard {...defaultProps} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  test('severity border class is applied', () => {
    const { container } = render(<RecommendationCard {...defaultProps} />);
    expect(container.innerHTML).toContain('border-l-[var(--severity-high-border)]');
  });

  test('has accessible aria-label with dimension and title', () => {
    render(<RecommendationCard {...defaultProps} />);
    expect(
      screen.getByRole('article', { name: /Clarity recommendation: Improve Communication/i }),
    ).toBeTruthy();
  });

  test('renders without actions gracefully', () => {
    render(<RecommendationCard {...defaultProps} actions={[]} />);
    expect(screen.getByText('Improve Communication')).toBeTruthy();
    // No list should be rendered
    expect(screen.queryByRole('list')).toBeNull();
  });
});
