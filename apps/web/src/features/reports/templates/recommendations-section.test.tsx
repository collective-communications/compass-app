import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { RecommendationsSection } from './recommendations-section';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for RecommendationsSection — verifies recommendations
 * render grouped by severity, titles appear, and the empty-recommendations
 * state renders an informational message.
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
      segments: {},
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: '',
      dimensionPercentages: { core: 72, clarity: 61 },
    },
    recommendations: [
      {
        dimension: 'core',
        severity: 'critical',
        title: 'Restore psychological safety',
        description: 'Top-priority action area.',
        actions: ['Step 1', 'Step 2'],
      },
      {
        dimension: 'clarity',
        severity: 'high',
        title: 'Clarify decision rights',
        description: 'Address ownership ambiguity.',
        actions: [],
      },
      {
        dimension: 'connection',
        severity: 'medium',
        title: 'Strengthen cross-team connections',
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

describe('RecommendationsSection', () => {
  test('renders the Recommendations heading', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    expect(screen.getByText('Recommendations')).toBeTruthy();
  });

  test('renders a count summary line', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    // e.g. "3 recommendations identified, prioritized by severity."
    const summary = screen.getByText(/recommendations identified/);
    expect(summary.textContent).toContain('3');
  });

  test('renders severity group headers for each present severity', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    expect(screen.getByText('Critical')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  test('renders each recommendation title', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    expect(screen.getByText('Restore psychological safety')).toBeTruthy();
    expect(screen.getByText('Clarify decision rights')).toBeTruthy();
    expect(screen.getByText('Strengthen cross-team connections')).toBeTruthy();
  });

  test('renders actions list for recommendations with actions', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('Step 2')).toBeTruthy();
  });

  test('renders dimension badges mapping raw dimension codes to labels', () => {
    render(<RecommendationsSection payload={makePayload()} />);
    // Dimension labels on the badge — "Core" appears within a pill
    expect(screen.getAllByText('Core').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Clarity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Connection').length).toBeGreaterThanOrEqual(1);
  });

  test('empty-data edge case: zero recommendations renders an empty-state message', () => {
    render(<RecommendationsSection payload={makePayload({ recommendations: [] })} />);
    expect(
      screen.getByText('No recommendations to display for this survey.'),
    ).toBeTruthy();
    // Severity group headers absent
    expect(screen.queryByText('Critical')).toBeNull();
  });

  test('groups by severity in canonical order (critical before high before medium)', () => {
    const { container } = render(<RecommendationsSection payload={makePayload()} />);
    const text = container.textContent ?? '';
    const criticalIdx = text.indexOf('Critical');
    const highIdx = text.indexOf('High');
    const mediumIdx = text.indexOf('Medium');
    expect(criticalIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeGreaterThan(criticalIdx);
    expect(mediumIdx).toBeGreaterThan(highIdx);
  });
});
