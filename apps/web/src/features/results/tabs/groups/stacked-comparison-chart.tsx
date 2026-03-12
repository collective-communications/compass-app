/**
 * Stacked comparison chart — CSS-only grouped bar chart.
 * One group per dimension, each bar represents a segment value.
 * Segments below threshold show a greyed-out bar with "n < threshold" label.
 * No charting library; pure Tailwind + inline styles.
 */

import type { ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import type { DimensionScoreRow } from '../../types';
import type { DimensionScoreMap } from '@compass/scoring';

const DIMENSIONS: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

/**
 * Palette for segment bars. Cycles if more segments than colours.
 * Chosen for sufficient contrast on white backgrounds.
 */
const SEGMENT_PALETTE = [
  '#0A3B4F',
  '#FF7F50',
  '#9FD7C3',
  '#E8B4A8',
  '#6B7280',
  '#FBBF24',
  '#34D399',
  '#F87171',
];

interface StackedComparisonChartProps {
  segmentRows: DimensionScoreRow[];
  overallScores: DimensionScoreMap;
  belowThresholdValues: Set<string>;
}

interface SegmentDimensionEntry {
  value: string;
  score: number | null;
}

export function StackedComparisonChart({
  segmentRows,
  overallScores,
  belowThresholdValues,
}: StackedComparisonChartProps): ReactElement {
  /** Collect unique segment values preserving insertion order. */
  const segmentValues: string[] = [];
  const seen = new Set<string>();
  for (const row of segmentRows) {
    if (!seen.has(row.segmentValue)) {
      seen.add(row.segmentValue);
      segmentValues.push(row.segmentValue);
    }
  }

  /** Build a Map<dimensionCode, Map<segmentValue, score>>. */
  const dataMap = new Map<DimensionCode, Map<string, number>>();
  for (const row of segmentRows) {
    let dimMap = dataMap.get(row.dimensionCode);
    if (!dimMap) {
      dimMap = new Map();
      dataMap.set(row.dimensionCode, dimMap);
    }
    dimMap.set(row.segmentValue, row.score ?? 0);
  }

  /** Assign colours to segment values. */
  const colorMap = new Map<string, string>();
  segmentValues.forEach((val, idx) => {
    colorMap.set(val, SEGMENT_PALETTE[idx % SEGMENT_PALETTE.length]!);
  });

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--grey-700)]">
        All Segments Comparison
      </h3>

      <div className="flex flex-col gap-6">
        {DIMENSIONS.map((dim) => {
          const dimScores = dataMap.get(dim);
          const overallScore = overallScores[dim]?.score ?? 0;

          return (
            <div key={dim}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--grey-700)]">
                  {DIMENSION_LABELS[dim]}
                </span>
                <span className="text-xs text-[var(--grey-500)]">
                  Overall: {Math.round(overallScore)}%
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {segmentValues.map((val) => {
                  const isBelowThreshold = belowThresholdValues.has(val);
                  const score = dimScores?.get(val) ?? null;

                  return (
                    <div key={val} className="flex items-center gap-2">
                      <span className="w-20 truncate text-right text-xs text-[var(--grey-500)]">
                        {val}
                      </span>
                      <div className="relative h-4 flex-1 rounded bg-[var(--grey-50)]">
                        {isBelowThreshold || score === null ? (
                          <>
                            <div
                              className="h-4 rounded bg-[var(--grey-300)]"
                              style={{ width: '20%' }}
                            />
                            <span className="absolute inset-0 flex items-center pl-2 text-[10px] text-[var(--grey-400)]">
                              n &lt; threshold
                            </span>
                          </>
                        ) : (
                          <div
                            className="h-4 rounded"
                            style={{
                              width: `${Math.min(score, 100)}%`,
                              backgroundColor: colorMap.get(val),
                            }}
                          />
                        )}
                        {/* Overall reference line */}
                        <div
                          className="absolute top-0 h-4 w-px bg-[var(--grey-700)]"
                          style={{ left: `${Math.min(overallScore, 100)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      {!isBelowThreshold && score !== null && (
                        <span className="w-8 text-right text-xs text-[var(--grey-700)]">
                          {Math.round(score)}%
                        </span>
                      )}
                      {(isBelowThreshold || score === null) && (
                        <span className="w-8" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--grey-100)] pt-3">
        {segmentValues.map((val) => (
          <div key={val} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{
                backgroundColor: belowThresholdValues.has(val)
                  ? 'var(--grey-300)'
                  : colorMap.get(val),
              }}
            />
            <span className="text-xs text-[var(--grey-500)]">{val}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-px bg-[var(--grey-700)]" />
          <span className="text-xs text-[var(--grey-500)]">Overall</span>
        </div>
      </div>
    </div>
  );
}
