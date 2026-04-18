/**
 * Compass visualization for a specific segment.
 * Transforms DimensionScoreRow[] into the DimensionScore[] shape
 * expected by the Compass component.
 */

import { useMemo, type ReactElement } from 'react';
import { Compass, type DimensionScore as CompassDimensionScore } from '@compass/compass';
import type { DimensionCode } from '@compass/types';
import { dimensions } from '@compass/tokens';
import type { DimensionScoreRow } from '../../types';

/** Brand colors per dimension. */
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

/** Display labels per dimension. */
const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

interface SegmentCompassProps {
  rows: DimensionScoreRow[];
  className?: string;
  /** Size in pixels passed to the Compass component. */
  size?: number;
}

function toCompassScores(rows: DimensionScoreRow[]): CompassDimensionScore[] {
  return rows.map((row) => ({
    dimension: row.dimensionCode,
    score: row.score ?? 0,
    color: DIMENSION_COLORS[row.dimensionCode],
    label: DIMENSION_LABELS[row.dimensionCode],
  }));
}

export function SegmentCompass({ rows, className, size = 320 }: SegmentCompassProps): ReactElement {
  // Memoize so the Compass component keeps a stable score-array reference
  // across parent re-renders that don't actually change `rows`.
  const scores = useMemo(() => toCompassScores(rows), [rows]);

  return (
    <div className={className} data-testid="segment-compass">
      <Compass
        scores={scores}
        size={size}
        showLabels
        showGapIndicator
        animated
      />
    </div>
  );
}
