import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentComparison } from './segment-comparison';

afterEach(cleanup);

describe('SegmentComparison', () => {
  test('renders segment rows with scores', () => {
    render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Engineering', dimensionCode: 'core', score: 3.5, overallScore: 3.0, isBelowThreshold: false },
          { segmentLabel: 'Marketing', dimensionCode: 'core', score: 2.5, overallScore: 3.0, isBelowThreshold: false },
        ]}
      />,
    );
    expect(screen.getByText('Engineering')).toBeTruthy();
    expect(screen.getByText('Marketing')).toBeTruthy();
  });

  test('shows positive delta indicator with + prefix', () => {
    const { container } = render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Engineering', dimensionCode: 'core', score: 3.5, overallScore: 3.0, isBelowThreshold: false },
        ]}
      />,
    );
    const delta = container.querySelector('[data-testid="delta-indicator"]');
    expect(delta).toBeTruthy();
    expect(delta!.textContent).toContain('+');
    expect(delta!.textContent).toContain('%');
  });

  test('shows negative delta indicator without + prefix', () => {
    const { container } = render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Marketing', dimensionCode: 'core', score: 2.5, overallScore: 3.0, isBelowThreshold: false },
        ]}
      />,
    );
    const delta = container.querySelector('[data-testid="delta-indicator"]');
    expect(delta).toBeTruthy();
    expect(delta!.textContent).not.toContain('+');
    expect(delta!.textContent).toContain('%');
  });

  test('hides below-threshold segment with anonymity message', () => {
    render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Executive', dimensionCode: 'core', score: 3.0, overallScore: 3.0, isBelowThreshold: true },
        ]}
      />,
    );
    const hidden = screen.getByTestId('segment-hidden');
    expect(hidden).toBeTruthy();
    expect(hidden.textContent).toContain('Not enough responses');
    expect(screen.queryByTestId('delta-indicator')).toBeNull();
  });

  test('custom anonymity message is displayed', () => {
    render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Executive', dimensionCode: 'core', score: 3.0, overallScore: 3.0, isBelowThreshold: true },
        ]}
        anonymityMessage="Data hidden for privacy."
      />,
    );
    expect(screen.getByText('Data hidden for privacy.')).toBeTruthy();
  });

  test('has accessible region label', () => {
    render(
      <SegmentComparison segments={[]} />,
    );
    expect(screen.getByRole('region', { name: 'Segment comparison' })).toBeTruthy();
  });

  test('mixes visible and hidden segments correctly', () => {
    const { container } = render(
      <SegmentComparison
        segments={[
          { segmentLabel: 'Engineering', dimensionCode: 'core', score: 3.5, overallScore: 3.0, isBelowThreshold: false },
          { segmentLabel: 'Executive', dimensionCode: 'core', score: 3.0, overallScore: 3.0, isBelowThreshold: true },
          { segmentLabel: 'Marketing', dimensionCode: 'core', score: 2.5, overallScore: 3.0, isBelowThreshold: false },
        ]}
      />,
    );
    const rows = container.querySelectorAll('[data-testid="segment-row"]');
    const hidden = container.querySelectorAll('[data-testid="segment-hidden"]');
    expect(rows).toHaveLength(2);
    expect(hidden).toHaveLength(1);
  });
});
