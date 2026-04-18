import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { CompassOverview } from './compass-overview';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for CompassOverview — assert that the static compass
 * SVG renders, the archetype card shows, and the summary table lists all
 * four dimensions. Empty-data edge case covers missing dimension scores.
 */

function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    survey: {
      id: 'survey-1',
      title: 'Q1 Culture Assessment',
      organizationName: 'Acme Corp',
      closesAt: '2026-04-01',
      responseCount: 42,
    },
    scores: {
      overall: 65,
      dimensions: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
      segments: {},
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: 'Prioritizes relationship-building.',
      dimensionPercentages: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
    },
    recommendations: [],
    branding: { orgLogoUrl: null, cccLogoUrl: null, colors: {} },
    sections: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe('CompassOverview', () => {
  test('renders the Compass Overview heading', () => {
    render(<CompassOverview payload={makePayload()} />);
    expect(screen.getByText('Compass Overview')).toBeTruthy();
  });

  test('renders the static compass SVG with an accessible label', () => {
    render(<CompassOverview payload={makePayload()} />);
    const svg = screen.getByLabelText('Culture compass visualization');
    expect(svg).toBeTruthy();
  });

  test('renders the archetype card with name and description', () => {
    render(<CompassOverview payload={makePayload()} />);
    expect(screen.getByText('The Connector')).toBeTruthy();
    expect(screen.getByText('Prioritizes relationship-building.')).toBeTruthy();
  });

  test('renders the dimension summary table with all four dimensions', () => {
    render(<CompassOverview payload={makePayload()} />);
    // Column headers
    expect(screen.getByText('Dimension')).toBeTruthy();
    expect(screen.getByText('Score')).toBeTruthy();
    // Each dimension label appears at least once (labels render both in the
    // SVG axis labels and again in the table body).
    expect(screen.getAllByText(/^Core$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^Clarity$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^Connection$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^Collaboration$/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays each dimension score as a rounded percentage', () => {
    render(<CompassOverview payload={makePayload()} />);
    // Scores render in both the SVG and the summary table, each with a % sign.
    expect(screen.getAllByText('72%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('61%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('55%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('48%').length).toBeGreaterThanOrEqual(1);
  });

  test('empty-data edge case: falls back to 0% for missing dimensions', () => {
    const payload = makePayload({
      scores: { overall: 0, dimensions: {}, segments: {} },
      compass: {
        archetype: 'Unclassified',
        archetypeDescription: '',
        dimensionPercentages: {},
      },
    });
    render(<CompassOverview payload={payload} />);
    // Table still renders with four rows of 0%, plus additional 0% labels
    // inside the compass SVG — just assert the "empty" state is present.
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(4);
  });
});
