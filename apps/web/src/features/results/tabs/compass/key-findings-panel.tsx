/**
 * Key Findings panel for the compass insights sidebar.
 * Shows observations derived from dimension scores and priority actions from risk flags.
 * Displayed when the compass tab is in "overview" mode (no specific dimension selected).
 */

import type { ReactElement } from 'react';
import type { DimensionScoreMap, RiskFlag, RiskSeverity } from '@compass/scoring';
import type { DimensionCode } from '@compass/types';
import { dimensions, severity as severityTokens } from '@compass/tokens';
import { ScoreRing } from './score-ring';

interface KeyFindingsPanelProps {
  scores: DimensionScoreMap;
  riskFlags: RiskFlag[];
  onViewRecommendations?: () => void;
}

const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

const SEVERITY_DOT_COLORS: Record<RiskSeverity, string> = {
  critical: severityTokens.critical.border,
  high: severityTokens.high.border,
  medium: severityTokens.medium.border,
  healthy: severityTokens.healthy.border,
};

interface Observation {
  dimension: DimensionCode;
  text: string;
}

/** Generate observation text from dimension scores. */
function deriveObservations(scores: DimensionScoreMap): Observation[] {
  const dims: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];
  const sorted = dims
    .map((d) => ({ dimension: d, score: scores[d]?.score ?? 0 }))
    .sort((a, b) => a.score - b.score);

  const observations: Observation[] = [];

  // Strongest dimension
  const strongest = sorted[sorted.length - 1];
  if (strongest) {
    observations.push({
      dimension: strongest.dimension,
      text: `${capitalize(strongest.dimension)} is your strongest dimension at ${Math.round(strongest.score)}%.`,
    });
  }

  // Weakest dimension
  const weakest = sorted[0];
  if (weakest) {
    observations.push({
      dimension: weakest.dimension,
      text: `${capitalize(weakest.dimension)} needs the most attention at ${Math.round(weakest.score)}%.`,
    });
  }

  // Largest gap between dimensions
  if (sorted.length >= 2) {
    const top = sorted[sorted.length - 1];
    const bottom = sorted[0];
    if (top && bottom) {
      const gap = top.score - bottom.score;
      observations.push({
        dimension: bottom.dimension,
        text: `There is a ${Math.round(gap)}-point gap between your strongest and weakest dimensions.`,
      });
    }
  }

  return observations.slice(0, 3);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function KeyFindingsPanel({
  scores,
  riskFlags,
  onViewRecommendations,
}: KeyFindingsPanelProps): ReactElement {
  const observations = deriveObservations(scores);
  const actionableFlags = riskFlags
    .filter((f) => f.severity !== 'healthy')
    .sort((a, b) => {
      const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, healthy: 3 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {/* Observations */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--grey-400)]">
          Observations
        </h3>
        <ul className="flex flex-col gap-3" aria-label="Key observations">
          {observations.map((obs, i) => (
            <li key={`${obs.dimension}-${i}`} className="flex items-start gap-3">
              <ScoreRing
                score={scores[obs.dimension]?.score ?? 0}
                color={DIMENSION_COLORS[obs.dimension] ?? '#424242'}
                size={28}
                strokeWidth={3}
                showLabel={false}
              />
              <span className="text-sm leading-relaxed text-[var(--grey-500)]">{obs.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Priority Actions */}
      {actionableFlags.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--grey-400)]">
            Priority Actions
          </h3>
          <ul className="flex flex-col gap-3" aria-label="Priority actions">
            {actionableFlags.map((flag, i) => (
              <li key={`${flag.dimensionCode}-${i}`} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: SEVERITY_DOT_COLORS[flag.severity] }}
                  aria-label={`${flag.severity} severity`}
                />
                <span className="text-sm leading-relaxed text-[var(--grey-500)]">{flag.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View all recommendations link */}
      {onViewRecommendations && (
        <button
          type="button"
          onClick={onViewRecommendations}
          className="text-sm font-medium text-[var(--color-core-text)] underline-offset-2 hover:underline"
        >
          View all recommendations
        </button>
      )}
    </div>
  );
}
