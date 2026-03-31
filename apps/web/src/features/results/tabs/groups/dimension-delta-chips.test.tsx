import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { DimensionDeltaChips } from './dimension-delta-chips';
import type { DimensionDelta } from './lib/compute-deltas';

afterEach(cleanup);

const mockDeltas: DimensionDelta[] = [
  { dimensionCode: 'core', label: 'Core', delta: 5, segmentScore: 65, overallScore: 60 },
  { dimensionCode: 'clarity', label: 'Clarity', delta: -15, segmentScore: 45, overallScore: 60 },
  { dimensionCode: 'connection', label: 'Connection', delta: 2, segmentScore: 62, overallScore: 60 },
  { dimensionCode: 'collaboration', label: 'Collaboration', delta: -12, segmentScore: 48, overallScore: 60 },
];

describe('DimensionDeltaChips', () => {
  test('renders all dimension labels and delta values', () => {
    render(<DimensionDeltaChips deltas={mockDeltas} />);
    expect(screen.getByText(/Core:/)).toBeTruthy();
    expect(screen.getByText(/Clarity:/)).toBeTruthy();
    expect(screen.getByText(/Connection:/)).toBeTruthy();
    expect(screen.getByText(/Collaboration:/)).toBeTruthy();
  });

  test('positive deltas show "above avg" text', () => {
    render(<DimensionDeltaChips deltas={mockDeltas} />);
    expect(screen.getByText('Core: +5% above avg')).toBeTruthy();
    expect(screen.getByText('Connection: +2% above avg')).toBeTruthy();
  });

  test('negative deltas show "below avg" text', () => {
    render(<DimensionDeltaChips deltas={mockDeltas} />);
    expect(screen.getByText('Clarity: -15% below avg')).toBeTruthy();
    expect(screen.getByText('Collaboration: -12% below avg')).toBeTruthy();
  });

  test('empty deltas array renders section header but no chips', () => {
    render(<DimensionDeltaChips deltas={[]} />);
    expect(screen.getByText('VS. ORGANIZATION AVERAGE')).toBeTruthy();
    // No chip elements rendered
    const chips = screen.queryAllByText(/avg/);
    expect(chips).toHaveLength(0);
  });

  test('delta values are rounded', () => {
    const fractionalDeltas: DimensionDelta[] = [
      { dimensionCode: 'core', label: 'Core', delta: 4.7, segmentScore: 64.7, overallScore: 60 },
    ];
    render(<DimensionDeltaChips deltas={fractionalDeltas} />);
    expect(screen.getByText('Core: +5% above avg')).toBeTruthy();
  });
});
