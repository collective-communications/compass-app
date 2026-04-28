/**
 * Mini compass visualization for the dashboard Latest Results card.
 * Renders the Compass component when scores are available, a skeleton while
 * loading, and nothing when scores are absent.
 */

import { useMemo, type ReactElement } from 'react';
import { Compass } from '@compass/compass';
import { dimensions } from '@compass/tokens';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreMap } from '@compass/scoring';

const DIMENSION_ORDER: readonly DimensionCode[] = [
  'core',
  'clarity',
  'connection',
  'collaboration',
] as const;

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

function toCompassScores(
  scores: DimensionScoreMap,
): Array<{ dimension: DimensionCode; score: number; color: string; label: string }> {
  return DIMENSION_ORDER.map((dim) => ({
    dimension: dim,
    score: scores[dim]?.score ?? 0,
    color: dimensions[dim].color,
    label: DIMENSION_LABELS[dim],
  }));
}

export interface DashboardCompassPreviewProps {
  scores: DimensionScoreMap | null | undefined;
  isLoading: boolean;
}

export function DashboardCompassPreview({
  scores,
  isLoading,
}: DashboardCompassPreviewProps): ReactElement | null {
  const compassScores = useMemo(
    () => (scores ? toCompassScores(scores) : null),
    [scores],
  );

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 8,
            background: 'var(--grey-50)',
          }}
        />
      </div>
    );
  }

  if (!compassScores) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0',
      }}
    >
      <Compass
        scores={compassScores}
        size={280}
        animated={false}
        showLabels={true}
        showGapIndicator={true}
      />
    </div>
  );
}
