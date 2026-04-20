/**
 * Reusable stacked horizontal Likert distribution bar chart.
 * Renders N segments dynamically based on the distribution keys.
 * Agree side uses the provided dimension color; disagree side uses greys.
 * A neutral midpoint (odd scales) uses a muted grey.
 */

import type { ReactElement } from 'react';
import { buildLikertLabels, DEFAULT_LIKERT_SIZE } from '@compass/types';
import type { LikertDistribution } from '../types';

export interface LikertBarChartProps {
  /** Distribution counts for each Likert value (keys 1..N). */
  distribution: LikertDistribution;
  /** Hex color for the agree side (higher values). */
  agreeColor: string;
  /** Number of points on the Likert scale. Defaults to 5. */
  scaleSize?: number;
  /** Height of the bar in pixels. */
  height?: number;
  /** Whether to show percentage labels below the bar. */
  showLabels?: boolean;
  className?: string;
}

interface Segment {
  key: number;
  label: string;
  shortLabel: string;
  percentage: number;
  color: string;
  opacity: number;
}

const DISAGREE_DARK = 'var(--grey-500)';
const DISAGREE_MID = 'var(--grey-400)';
const DISAGREE_LIGHT = 'var(--grey-300)';
const NEUTRAL_COLOR = 'var(--grey-100)';

/** Compute percentage from raw count relative to total. */
function toPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Build a short label from the full label for compact display.
 * E.g., "Strongly Agree" -> "SA", "Neither Agree nor Disagree" -> "N"
 */
function abbreviate(label: string): string {
  if (label.startsWith('Neither')) return 'N';
  if (label.startsWith('Neutral')) return 'N';
  const words = label.split(/\s+/);
  return words.map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/**
 * Build color and opacity for a segment based on its position within the scale.
 *
 * Layout (highest value first, rendered left-to-right):
 * - Agree side (top half of scale): dimension color with decreasing opacity
 * - Neutral midpoint (odd scales only): muted grey
 * - Disagree side (bottom half of scale): greys with increasing darkness
 */
function segmentStyle(
  value: number,
  scaleSize: number,
  agreeColor: string,
): { color: string; opacity: number } {
  const midpoint = (scaleSize + 1) / 2;

  // Agree side: values above midpoint
  if (value > midpoint) {
    const agreeCount = Math.floor(scaleSize / 2);
    const position = value - Math.ceil(midpoint); // 1-based position from bottom of agree
    const opacity = 0.5 + 0.5 * (position / agreeCount);
    return { color: agreeColor, opacity: Math.min(opacity, 1) };
  }

  // Neutral midpoint (odd scales only)
  if (scaleSize % 2 === 1 && value === midpoint) {
    return { color: NEUTRAL_COLOR, opacity: 1 };
  }

  // Disagree side: values below midpoint
  const disagreeCount = Math.floor(scaleSize / 2);
  const position = Math.ceil(midpoint) - value; // 1-based distance from midpoint
  if (position >= disagreeCount) return { color: DISAGREE_DARK, opacity: 1 };
  if (position >= disagreeCount / 2) return { color: DISAGREE_MID, opacity: 1 };
  return { color: DISAGREE_LIGHT, opacity: 1 };
}

export function LikertBarChart({
  distribution,
  agreeColor,
  scaleSize = DEFAULT_LIKERT_SIZE,
  height = 24,
  showLabels = true,
  className,
}: LikertBarChartProps): ReactElement {
  const labels = buildLikertLabels(scaleSize);

  // Calculate total from distribution values
  let total = 0;
  for (let i = 1; i <= scaleSize; i++) {
    total += distribution[i] ?? 0;
  }

  // Build segments from highest value to lowest (agree first, disagree last)
  const segments: Segment[] = [];
  for (let value = scaleSize; value >= 1; value--) {
    const count = distribution[value] ?? 0;
    const fullLabel = labels[value] ?? `Value ${value}`;
    const style = segmentStyle(value, scaleSize, agreeColor);
    segments.push({
      key: value,
      label: fullLabel,
      shortLabel: abbreviate(fullLabel),
      percentage: toPercentage(count, total),
      color: style.color,
      opacity: style.opacity,
    });
  }

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
