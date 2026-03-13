/**
 * Reusable stacked horizontal Likert distribution bar chart.
 * Renders 4 segments (SA, A, D, SD) as proportional-width bars.
 * Agree side uses the provided dimension color; disagree side uses greys.
 */

import type { ReactElement } from 'react';
import type { LikertDistribution } from '../types';

export interface LikertBarChartProps {
  /** Distribution counts for each Likert value (1=SD, 2=D, 3=A, 4=SA). */
  distribution: LikertDistribution;
  /** Hex color for the agree side (SA + A). */
  agreeColor: string;
  /** Height of the bar in pixels. */
  height?: number;
  /** Whether to show percentage labels below the bar. */
  showLabels?: boolean;
  className?: string;
}

interface Segment {
  key: string;
  label: string;
  shortLabel: string;
  percentage: number;
  color: string;
  opacity: number;
}

const DISAGREE_DARK = 'var(--grey-400)';
const DISAGREE_LIGHT = 'var(--grey-300)';

/** Compute percentage from raw count relative to total. */
function toPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export function LikertBarChart({
  distribution,
  agreeColor,
  height = 24,
  showLabels = true,
  className,
}: LikertBarChartProps): ReactElement {
  const total = distribution[1] + distribution[2] + distribution[3] + distribution[4];

  const segments: Segment[] = [
    {
      key: 'sa',
      label: 'Strongly Agree',
      shortLabel: 'SA',
      percentage: toPercentage(distribution[4], total),
      color: agreeColor,
      opacity: 1,
    },
    {
      key: 'a',
      label: 'Agree',
      shortLabel: 'A',
      percentage: toPercentage(distribution[3], total),
      color: agreeColor,
      opacity: 0.7,
    },
    {
      key: 'd',
      label: 'Disagree',
      shortLabel: 'D',
      percentage: toPercentage(distribution[2], total),
      color: DISAGREE_LIGHT,
      opacity: 1,
    },
    {
      key: 'sd',
      label: 'Strongly Disagree',
      shortLabel: 'SD',
      percentage: toPercentage(distribution[1], total),
      color: DISAGREE_DARK,
      opacity: 1,
    },
  ];

  return (
    <div className={className}>
      <div
        className="flex w-full overflow-hidden rounded"
        style={{ height }}
        role="img"
        aria-label={segments
          .map((s) => `${s.label}: ${s.percentage}%`)
          .join(', ')}
      >
        {segments.map((segment) =>
          segment.percentage > 0 ? (
            <div
              key={segment.key}
              className="transition-all duration-300"
              style={{
                width: `${segment.percentage}%`,
                backgroundColor: segment.color,
                opacity: segment.opacity,
                minWidth: segment.percentage > 0 ? '2px' : 0,
              }}
              aria-hidden="true"
            />
          ) : null,
        )}
      </div>
      {showLabels && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {segments.map((s, i) => (
            <span key={s.key}>
              {i > 0 && <span className="mx-1">&middot;</span>}
              {s.shortLabel} {s.percentage}%
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
