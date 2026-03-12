/**
 * Insights panel content for a selected dimension.
 * Shows dimension name, score ring, description, and risk status.
 * Rendered inside the ResultsLayout InsightsPanel slot.
 */

import type { ReactElement } from 'react';
import type { DimensionScoreMap, RiskFlag } from '@compass/scoring';
import { dimensions, greyscale } from '@compass/tokens';
import type { DimensionNavId } from './dimension-nav-item';
import { ScoreRing } from './score-ring';

interface DimensionDetailPanelProps {
  dimension: DimensionNavId;
  scores: DimensionScoreMap;
  riskFlags: RiskFlag[];
}

const DIMENSION_COLORS: Record<DimensionNavId, string> = {
  overview: greyscale[700],
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

const DIMENSION_DESCRIPTIONS: Record<DimensionNavId, string> = {
  overview:
    'The overall culture compass score reflects the average health across all four dimensions. It provides a high-level snapshot of organizational culture.',
  core:
    'Core measures foundational trust, psychological safety, and shared values. A strong Core is the prerequisite for healthy outer dimensions.',
  clarity:
    'Clarity captures role definition, strategic alignment, and communication effectiveness. Organizations with high Clarity move decisively.',
  connection:
    'Connection reflects interpersonal bonds, belonging, and inclusion. High Connection cultures retain talent and foster resilience.',
  collaboration:
    'Collaboration assesses cross-functional alignment, knowledge sharing, and collective problem-solving capacity.',
};

function getOverviewScore(scores: DimensionScoreMap): number {
  const dims = Object.values(scores);
  if (dims.length === 0) return 0;
  return dims.reduce((sum, d) => sum + d.score, 0) / dims.length;
}

export function DimensionDetailPanel({
  dimension,
  scores,
  riskFlags,
}: DimensionDetailPanelProps): ReactElement {
  const score =
    dimension === 'overview' ? getOverviewScore(scores) : (scores[dimension]?.score ?? 0);

  const flag = dimension !== 'overview'
    ? riskFlags.find((f) => f.dimensionCode === dimension)
    : undefined;

  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <ScoreRing
          score={score}
          color={DIMENSION_COLORS[dimension]}
          size={64}
          strokeWidth={5}
        />
        <div>
          <h3 className="text-lg font-bold text-[var(--grey-900)]">{label}</h3>
          <p className="text-sm text-[var(--grey-500)]">{Math.round(score)}% score</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[var(--grey-500)]">
        {DIMENSION_DESCRIPTIONS[dimension]}
      </p>

      {flag && flag.severity !== 'healthy' && (
        <div className="rounded-lg bg-[var(--severity-medium-bg)] p-3">
          <p className="text-sm font-medium text-[var(--grey-500)]">{flag.message}</p>
        </div>
      )}
    </div>
  );
}
