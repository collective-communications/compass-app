import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SubcultureAlert } from './subculture-alert';
import type { DimensionDelta } from './lib/compute-deltas';

afterEach(cleanup);

const mockDeltas: DimensionDelta[] = [
  { dimensionCode: 'core', label: 'Core', delta: 5, segmentScore: 65, overallScore: 60 },
  { dimensionCode: 'clarity', label: 'Clarity', delta: -15, segmentScore: 45, overallScore: 60 },
  { dimensionCode: 'connection', label: 'Connection', delta: 2, segmentScore: 62, overallScore: 60 },
  { dimensionCode: 'collaboration', label: 'Collaboration', delta: -12, segmentScore: 48, overallScore: 60 },
];

describe('SubcultureAlert', () => {
  test('renders "SUBCULTURE ALERT" heading when deviations exist', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(screen.getByText('SUBCULTURE ALERT')).toBeTruthy();
  });

  test('shows segment name in description text', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(screen.getByText(/Engineering/)).toBeTruthy();
  });

  test('shows dimension name in description', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(
      screen.getByText(/Clarity/),
    ).toBeTruthy();
  });

  test('has role="alert" for accessibility', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  test('returns null when deviatingDimensions is empty', () => {
    const { container } = render(
      <SubcultureAlert segmentLabel="Engineering" deviatingDimensions={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('shows explanatory text about process barriers', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(
      screen.getByText(/process barriers, tool fragmentation, or organizational silos/),
    ).toBeTruthy();
  });

  test('uses singular description for one deviating dimension', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1]]}
      />,
    );
    expect(
      screen.getByText(
        'Engineering shows significantly lower Clarity scores than the organization average.',
      ),
    ).toBeTruthy();
  });

  test('uses plural description for multiple deviating dimensions', () => {
    render(
      <SubcultureAlert
        segmentLabel="Engineering"
        deviatingDimensions={[mockDeltas[1], mockDeltas[3]]}
      />,
    );
    expect(
      screen.getByText(
        'Engineering shows significantly different scores in Clarity, Collaboration compared to the organization average.',
      ),
    ).toBeTruthy();
  });
});
