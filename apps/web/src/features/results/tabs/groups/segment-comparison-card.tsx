/**
 * Side-by-side comparison of a segment's scores vs overall.
 * Shows dimension bars with delta indicators.
 * Deltas > 10% are highlighted in bold.
 */

import type { ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreRow } from '../../types';
import type { DimensionScoreMap } from '@compass/scoring';

/** Brand colors per dimension. */
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: '#0A3B4F',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
};

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const DIMENSIONS: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

interface SegmentComparisonCardProps {
  segmentLabel: string;
  segmentRows: DimensionScoreRow[];
  overallScores: DimensionScoreMap;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${Math.round(delta)}%`;
}

function deltaColor(delta: number): string {
  if (delta >= 0) return 'text-green-700';
  return 'text-red-700';
}

export function SegmentComparisonCard({
  segmentLabel,
  segmentRows,
  overallScores,
}: SegmentComparisonCardProps): ReactElement {
  /** Build a lookup from segment rows. */
  const segmentScoreMap = new Map<DimensionCode, number>();
  for (const row of segmentRows) {
    segmentScoreMap.set(row.dimensionCode, row.score);
  }

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--grey-700)]">
        {segmentLabel} vs Overall
      </h3>

      <div className="flex flex-col gap-4">
        {DIMENSIONS.map((dim) => {
          const segmentScore = segmentScoreMap.get(dim) ?? 0;
          const overallScore = overallScores[dim]?.score ?? 0;
          const delta = segmentScore - overallScore;
          const isLargeDelta = Math.abs(delta) > 10;

          return (
            <div key={dim} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--grey-500)]">
                  {DIMENSION_LABELS[dim]}
                </span>
                <span
                  className={`text-xs ${deltaColor(delta)} ${isLargeDelta ? 'font-bold' : 'font-medium'}`}
                >
                  {formatDelta(delta)}
                </span>
              </div>

              {/* Segment bar */}
              <div className="flex items-center gap-2">
                <span className="w-14 text-right text-xs text-[var(--grey-500)]">
                  {segmentLabel}
                </span>
                <div className="h-3 flex-1 rounded-full bg-[var(--grey-50)]">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${Math.min(segmentScore, 100)}%`,
                      backgroundColor: DIMENSION_COLORS[dim],
                    }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-[var(--grey-700)]">
                  {Math.round(segmentScore)}%
                </span>
              </div>

              {/* Overall bar */}
              <div className="flex items-center gap-2">
                <span className="w-14 text-right text-xs text-[var(--grey-500)]">
                  Overall
                </span>
                <div className="h-3 flex-1 rounded-full bg-[var(--grey-50)]">
                  <div
                    className="h-3 rounded-full bg-[var(--grey-400)]"
                    style={{ width: `${Math.min(overallScore, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-[var(--grey-700)]">
                  {Math.round(overallScore)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
