import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentAnalysis } from './segment-analysis';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for SegmentAnalysis — verifies the comparison table
 * renders, below-threshold segments are omitted with a notice, and the
 * empty-segments state renders gracefully.
 */

function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    survey: {
      id: 'survey-1',
      title: 'Q1',
      organizationName: 'Acme',
      closesAt: '2026-04-01',
      responseCount: 42,
    },
    scores: {
      overall: 65,
      dimensions: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
      segments: {
        'department:engineering': { core: 75, clarity: 62, connection: 58, collaboration: 50 },
        'department:marketing': { core: 68, clarity: 60, connection: 54, collaboration: 46 },
      },
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: '',
      dimensionPercentages: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
    },
    recommendations: [],
    branding: { orgLogoUrl: null, cccLogoUrl: null, colors: {} },
    sections: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe('SegmentAnalysis', () => {
  test('renders the Segment Analysis heading', () => {
    render(<SegmentAnalysis payload={makePayload()} />);
    expect(screen.getByText('Segment Analysis')).toBeTruthy();
  });

  test('renders a row per visible segment', () => {
    render(<SegmentAnalysis payload={makePayload()} />);
    expect(screen.getByText('department:engineering')).toBeTruthy();
    expect(screen.getByText('department:marketing')).toBeTruthy();
  });

  test('renders the column headers for each dimension', () => {
    render(<SegmentAnalysis payload={makePayload()} />);
    expect(screen.getByText('Segment')).toBeTruthy();
    // Dimension labels in the header row
    expect(screen.getAllByText('Core').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Clarity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Connection').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Collaboration').length).toBeGreaterThanOrEqual(1);
  });

  test('mentions the total response count in the summary line', () => {
    render(<SegmentAnalysis payload={makePayload()} />);
    // "Based on 42 total responses."
    expect(screen.getByText(/42/)).toBeTruthy();
  });

  test('empty-segments state: no segments → informational card renders', () => {
    const payload = makePayload({
      scores: { overall: 0, dimensions: {}, segments: {} },
    });
    render(<SegmentAnalysis payload={payload} />);
    expect(
      screen.getByText('No segment data is available for this survey.'),
    ).toBeTruthy();
  });

  test('filters out segments where every dimension score is null (below threshold)', () => {
    const payload = makePayload({
      scores: {
        overall: 65,
        dimensions: { core: 72 },
        segments: {
          'department:engineering': { core: 75, clarity: 62 },
          'department:tiny-team': {
            // all nulls — below anonymity threshold
            core: null as unknown as number,
            clarity: null as unknown as number,
          },
        },
      },
    });
    render(<SegmentAnalysis payload={payload} />);
    expect(screen.getByText('department:engineering')).toBeTruthy();
    expect(screen.queryByText('department:tiny-team')).toBeNull();
    // Hidden notice appears
    expect(screen.getByText(/1 segment hidden due to insufficient responses/)).toBeTruthy();
  });
});
