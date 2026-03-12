/**
 * Compass Tab — default landing view of the results section.
 * Renders the interactive compass visualization, archetype card,
 * risk flags, core health indicator, and dimension navigation.
 *
 * Layout:
 * - Desktop 3-column: dimension nav sidebar (200px) | compass content | insights panel
 * - Mobile: chip strip → compass content → insights stacked
 */

import { useState, useCallback, type ReactElement } from 'react';
import { Compass } from '@compass/compass';
import type { DimensionCode } from '@compass/types';
import { dimensions } from '@compass/tokens';
import type { DimensionScoreMap, RiskFlag, ArchetypeMatch } from '@compass/scoring';
import { DimensionNav } from './dimension-nav';
import { ArchetypeCard } from './archetype-card';
import { RiskFlagList } from './risk-flag-list';
import { CoreHealthIndicator } from './core-health-indicator';
import { DimensionDetailPanel } from './dimension-detail-panel';
import { KeyFindingsPanel } from './key-findings-panel';
import type { DimensionNavId } from './dimension-nav-item';

interface CompassTabProps {
  scores: DimensionScoreMap;
  archetype: ArchetypeMatch;
  riskFlags: RiskFlag[];
  activeDimension?: DimensionNavId;
  onDimensionChange?: (dimension: DimensionNavId) => void;
}

/** Brand colors per compass dimension, matching the Compass component contract. */
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

/** Map DimensionScoreMap to the Compass component's expected score format. */
function toCompassScores(
  scores: DimensionScoreMap,
): Array<{ dimension: DimensionCode; score: number; color: string; label: string }> {
  return (['core', 'clarity', 'connection', 'collaboration'] as const).map((dim) => ({
    dimension: dim,
    score: scores[dim]?.score ?? 0,
    color: DIMENSION_COLORS[dim],
    label: DIMENSION_LABELS[dim],
  }));
}

export function CompassTab({ scores, archetype, riskFlags, activeDimension: controlledDimension, onDimensionChange }: CompassTabProps): ReactElement {
  const [localDimension, setLocalDimension] = useState<DimensionNavId>('overview');
  const activeDimension = controlledDimension ?? localDimension;
  const setActiveDimension = onDimensionChange ?? setLocalDimension;

  const selectedSegment: DimensionCode | null =
    activeDimension === 'overview' ? null : activeDimension;

  const handleSegmentClick = useCallback((dimension: DimensionCode) => {
    setActiveDimension(activeDimension === dimension ? 'overview' : dimension);
  }, [activeDimension, setActiveDimension]);

  const handleDimensionSelect = useCallback((id: DimensionNavId) => {
    setActiveDimension(id);
  }, [setActiveDimension]);

  const compassScores = toCompassScores(scores);
  const coreScore = scores.core?.score ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile chip strip */}
      <DimensionNav
        scores={scores}
        riskFlags={riskFlags}
        activeDimension={activeDimension}
        onSelect={handleDimensionSelect}
      />

      <div className="flex gap-6">
        {/* Desktop sidebar — hidden on mobile (DimensionNav handles responsive rendering) */}

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Core health + archetype row */}
          <div className="flex flex-wrap items-center gap-4">
            <CoreHealthIndicator coreScore={coreScore} />
          </div>

          {/* Compass visualization */}
          <div className="flex justify-center">
            <Compass
              scores={compassScores}
              selectedSegment={selectedSegment}
              onSegmentClick={handleSegmentClick}
              size={320}
              animated
              showLabels
              showGapIndicator
            />
          </div>

          {/* Archetype card */}
          <ArchetypeCard match={archetype} />

          {/* Risk flags */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--grey-400)]">
              Risk Flags
            </h3>
            <RiskFlagList flags={riskFlags} />
          </div>
        </div>
      </div>

      {/* Mobile: dimension detail below compass content */}
      <div className="lg:hidden">
        <DimensionDetailPanel
          dimension={activeDimension}
          scores={scores}
          riskFlags={riskFlags}
        />
      </div>
    </div>
  );
}

/**
 * Content for the insights panel slot (desktop only).
 * Consumed by the parent results page to pass into ResultsLayout.insightsContent.
 */
export function CompassInsightsContent({
  scores,
  riskFlags,
  activeDimension,
  onViewRecommendations,
}: {
  scores: DimensionScoreMap;
  riskFlags: RiskFlag[];
  activeDimension: DimensionNavId;
  onViewRecommendations?: () => void;
}): ReactElement {
  if (activeDimension === 'overview') {
    return (
      <KeyFindingsPanel
        scores={scores}
        riskFlags={riskFlags}
        onViewRecommendations={onViewRecommendations}
      />
    );
  }

  return (
    <DimensionDetailPanel
      dimension={activeDimension}
      scores={scores}
      riskFlags={riskFlags}
    />
  );
}
