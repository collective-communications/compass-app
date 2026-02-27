/**
 * Compass visualization for a specific segment.
 * Transforms DimensionScoreRow[] into the DimensionScore[] shape
 * expected by the Compass component.
 */

import type { ReactElement } from 'react';
import { Compass, type DimensionScore as CompassDimensionScore } from '@compass/compass';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreRow } from '../../types';

/** Brand colors per dimension. */
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: '#0A3B4F',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
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
}

function toCompassScores(rows: DimensionScoreRow[]): CompassDimensionScore[] {
  return rows.map((row) => ({
    dimension: row.dimensionCode,
    score: row.score ?? 0,
    color: DIMENSION_COLORS[row.dimensionCode],
    label: DIMENSION_LABELS[row.dimensionCode],
  }));
}

export function SegmentCompass({ rows, className }: SegmentCompassProps): ReactElement {
  const scores = toCompassScores(rows);

  return (
    <div className={className}>
      <Compass
        scores={scores}
        size={320}
        showLabels
        showGapIndicator
        animated
      />
    </div>
  );
}
