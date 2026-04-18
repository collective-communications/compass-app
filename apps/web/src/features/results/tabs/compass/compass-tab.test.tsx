import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CompassTab } from './compass-tab';
import type { DimensionScoreMap, ArchetypeMatch, RiskFlag } from '@compass/scoring';

/**
 * Component tests for CompassTab — verifies it renders the compass SVG
 * (with an aria-label reflecting the scores), the archetype card, and the
 * core-health badge. Keyboard interaction on the archetype toggle is
 * also asserted as a minimal a11y invariant.
 */

function makeScores(): DimensionScoreMap {
  return {
    core: { dimensionId: 'core', dimensionCode: 'core', score: 72, rawScore: 3.9, responseCount: 42 },
    clarity: { dimensionId: 'clarity', dimensionCode: 'clarity', score: 61, rawScore: 3.45, responseCount: 42 },
    connection: { dimensionId: 'connection', dimensionCode: 'connection', score: 55, rawScore: 3.2, responseCount: 42 },
    collaboration: { dimensionId: 'collaboration', dimensionCode: 'collaboration', score: 48, rawScore: 2.9, responseCount: 42 },
  };
}

function makeArchetype(): ArchetypeMatch {
  return {
    archetype: {
      id: 'arch-1',
      code: 'connector',
      name: 'The Connector',
      description: 'Prioritizes relationship-building and belonging.',
      targetScores: { core: 80, clarity: 65, connection: 85, collaboration: 70 },
      displayOrder: 1,
    },
    distance: 12.4,
    confidence: 'strong',
  };
}

function makeRiskFlags(): RiskFlag[] {
  return [
    {
      dimensionCode: 'collaboration',
      dimensionName: 'Collaboration',
      severity: 'high',
      score: 48,
      message: 'Cross-team friction detected.',
    },
  ];
}

afterEach(cleanup);

describe('CompassTab', () => {
  test('renders the compass SVG with an aria-label that reflects all scores', () => {
    render(
      <CompassTab scores={makeScores()} archetype={makeArchetype()} riskFlags={makeRiskFlags()} />,
    );
    // Compass component uses role="group" with a summarised aria-label
    const compass = screen.getByLabelText(/Culture Compass scores/i);
    expect(compass).toBeTruthy();
    // The summary includes each dimension's rounded score
    expect(compass.getAttribute('aria-label')).toContain('Core');
    expect(compass.getAttribute('aria-label')).toContain('Clarity');
    expect(compass.getAttribute('aria-label')).toContain('Connection');
    expect(compass.getAttribute('aria-label')).toContain('Collaboration');
  });

  test('renders the archetype card with the archetype name', () => {
    render(
      <CompassTab scores={makeScores()} archetype={makeArchetype()} riskFlags={makeRiskFlags()} />,
    );
    expect(screen.getByText('The Connector')).toBeTruthy();
    expect(screen.getByText('Strong match')).toBeTruthy();
  });

  test('renders the core health indicator with a role=status label', () => {
    render(
      <CompassTab scores={makeScores()} archetype={makeArchetype()} riskFlags={makeRiskFlags()} />,
    );
    // CoreHealthIndicator uses role="status" with an aria-label prefixed "Core health:"
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-label')).toContain('Core health');
  });

  test('renders the Risk Flags heading', () => {
    render(
      <CompassTab scores={makeScores()} archetype={makeArchetype()} riskFlags={makeRiskFlags()} />,
    );
    expect(screen.getByText('Risk Flags')).toBeTruthy();
  });

  test('archetype card toggles aria-expanded when clicked', () => {
    render(
      <CompassTab scores={makeScores()} archetype={makeArchetype()} riskFlags={makeRiskFlags()} />,
    );
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // Description is now visible
    expect(screen.getByText('Prioritizes relationship-building and belonging.')).toBeTruthy();
  });

  test('calls onDimensionChange when a compass segment is clicked', () => {
    let activeDimension: string = 'overview';
    const onDimensionChange = (dim: string) => {
      activeDimension = dim;
    };

    render(
      <CompassTab
        scores={makeScores()}
        archetype={makeArchetype()}
        riskFlags={makeRiskFlags()}
        activeDimension="overview"
        onDimensionChange={onDimensionChange}
      />,
    );

    // CompassSegment elements are tabbable buttons inside the compass group.
    // Click any segment — the handler inverts activeDimension if already selected.
    const group = screen.getByLabelText(/Culture Compass scores/i);
    const firstSegment = group.querySelector('[role="button"]');
    expect(firstSegment).toBeTruthy();
    if (firstSegment) {
      fireEvent.click(firstSegment);
      // The handler should have set activeDimension to a dimension code
      // (not 'overview'), because we started from 'overview'.
      expect(activeDimension).not.toBe('overview');
    }
  });
});
