import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { DimensionDeepDive } from './dimension-deep-dive';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for DimensionDeepDive — asserts that a page renders
 * per dimension in scores.dimensions, with headings, risk indicators, and
 * dimension-specific recommendations.
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
      dimensions: { core: 72, clarity: 61 },
      segments: {
        'department:engineering': { core: 75, clarity: 62 },
      },
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: '',
      dimensionPercentages: { core: 72, clarity: 61 },
    },
    recommendations: [
      {
        dimension: 'core',
        severity: 'high',
        title: 'Rebuild psych safety',
        description: 'Focus on trust-building practices across leadership.',
        actions: ['Action A', 'Action B'],
      },
      {
        dimension: 'clarity',
        severity: 'medium',
        title: 'Clarify role expectations',
        description: '',
        actions: [],
      },
    ],
    branding: { orgLogoUrl: null, cccLogoUrl: null, colors: {} },
    sections: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe('DimensionDeepDive', () => {
  test('renders one section per dimension in scores.dimensions', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    // Dimension labels render (once each, in the section header).
    // "Core" and "Clarity" both appear as section titles.
    expect(screen.getAllByText('Core').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Clarity').length).toBeGreaterThanOrEqual(1);
  });

  test('renders a severity risk indicator per dimension section', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    // 72% → medium, 61% → medium (both between 55 and 70)
    const mediumIndicators = screen.getAllByText(/Medium Risk/);
    expect(mediumIndicators.length).toBeGreaterThanOrEqual(1);
  });

  test('renders the "Overall ... Score" section for each dimension', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    expect(screen.getByText(/Overall Core Score/)).toBeTruthy();
    expect(screen.getByText(/Overall Clarity Score/)).toBeTruthy();
  });

  test('renders dimension-specific recommendations with titles', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    expect(screen.getByText('Rebuild psych safety')).toBeTruthy();
    expect(screen.getByText('Clarify role expectations')).toBeTruthy();
  });

  test('renders the actions list for a recommendation that has actions', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    expect(screen.getByText('Action A')).toBeTruthy();
    expect(screen.getByText('Action B')).toBeTruthy();
  });

  test('renders the segment breakdown when segments exist', () => {
    render(<DimensionDeepDive payload={makePayload()} />);
    // "Segment Breakdown" subtitle appears once per dimension with segments.
    const breakdowns = screen.getAllByText('Segment Breakdown');
    expect(breakdowns.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('department:engineering').length).toBeGreaterThanOrEqual(1);
  });

  test('empty-data edge case: no dimensions → renders nothing', () => {
    const payload = makePayload({
      scores: { overall: 0, dimensions: {}, segments: {} },
    });
    const { container } = render(<DimensionDeepDive payload={payload} />);
    // No dimension pages — container should have no ".report-page" div
    expect(container.querySelector('.report-page')).toBeNull();
  });

  test('skips a dimension when its key has no metadata in DIMENSION_META', () => {
    const payload = makePayload({
      scores: { overall: 0, dimensions: { unknown_dim: 50 }, segments: {} },
    });
    const { container } = render(<DimensionDeepDive payload={payload} />);
    // Unknown dimension returns null so no page is rendered
    expect(container.querySelector('.report-page')).toBeNull();
  });
});
