import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { ExecutiveSummary } from './executive-summary';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for ExecutiveSummary — assert that the overall score,
 * archetype, per-dimension cards, and (when applicable) key-findings counts
 * render correctly. Covers both populated and empty recommendation lists.
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
    recommendations: [
      { dimension: 'core', severity: 'critical', title: 'Fix trust', description: '...', actions: [] },
      { dimension: 'clarity', severity: 'critical', title: 'Fix clarity', description: '...', actions: [] },
      { dimension: 'connection', severity: 'high', title: 'Connect teams', description: '...', actions: [] },
    ],
    branding: {
      orgLogoUrl: null,
      cccLogoUrl: null,
      colors: { primary: '#0C3D50' },
    },
    sections: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe('ExecutiveSummary', () => {
  test('renders the Executive Summary heading', () => {
    render(<ExecutiveSummary payload={makePayload()} />);
    expect(screen.getByText('Executive Summary')).toBeTruthy();
  });

  test('renders the overall score label and archetype', () => {
    render(<ExecutiveSummary payload={makePayload()} />);
    expect(screen.getByText('Overall Culture Score')).toBeTruthy();
    expect(screen.getByText(/The Connector/)).toBeTruthy();
  });

  test('renders a card per dimension with its label', () => {
    render(<ExecutiveSummary payload={makePayload()} />);
    expect(screen.getByText('Core')).toBeTruthy();
    expect(screen.getByText('Clarity')).toBeTruthy();
    expect(screen.getByText('Connection')).toBeTruthy();
    expect(screen.getByText('Collaboration')).toBeTruthy();
  });

  test('renders the Key Findings section with critical and high counts', () => {
    render(<ExecutiveSummary payload={makePayload()} />);
    expect(screen.getByText('Key Findings')).toBeTruthy();
    // 2 critical → "2 critical risks identified"
    expect(screen.getByText(/critical risks? identified/)).toBeTruthy();
    // 1 high → "1 high-priority area requiring attention"
    expect(screen.getByText(/high-priority areas? requiring attention/)).toBeTruthy();
  });

  test('omits Key Findings when no critical or high recommendations exist', () => {
    const payload = makePayload({
      recommendations: [
        { dimension: 'core', severity: 'medium', title: 'Minor issue', description: '', actions: [] },
      ],
    });
    render(<ExecutiveSummary payload={payload} />);
    expect(screen.queryByText('Key Findings')).toBeNull();
  });

  test('empty-data edge case: handles empty dimensions record gracefully', () => {
    const payload = makePayload({
      scores: { overall: 0, dimensions: {}, segments: {} },
    });
    const { container } = render(<ExecutiveSummary payload={payload} />);
    // Still renders the heading and overall score block
    expect(screen.getByText('Executive Summary')).toBeTruthy();
    // No dimension cards
    expect(container.querySelector('[data-dimension-card]')).toBeNull();
  });

  test('includes each dimension score as a percentage in the card', () => {
    render(<ExecutiveSummary payload={makePayload()} />);
    expect(screen.getByText('72%')).toBeTruthy();
    expect(screen.getByText('61%')).toBeTruthy();
    expect(screen.getByText('55%')).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
  });
});
