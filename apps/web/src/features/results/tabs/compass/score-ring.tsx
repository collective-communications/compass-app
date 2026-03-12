/**
 * Circular SVG progress ring showing a dimension score as a percentage.
 * Stroke-dasharray is proportional to the score (0-100).
 */

import type { ReactElement } from 'react';

interface ScoreRingProps {
  /** Score as a percentage (0-100). */
  score: number;
  /** Hex color for the filled stroke. */
  color: string;
  /** Diameter of the ring in pixels. */
  size?: number;
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Whether to show the score text in the center. */
  showLabel?: boolean;
  className?: string;
}

const TRACK_COLOR = 'var(--track-color)';

export function ScoreRing({
  score,
  color,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  className,
}: ScoreRingProps): ReactElement {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`Score: ${Math.round(clampedScore)}%`}
      role="img"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={TRACK_COLOR}
        strokeWidth={strokeWidth}
      />
      {/* Filled arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-[var(--grey-700)] text-xs font-semibold"
        >
          {Math.round(clampedScore)}
        </text>
      )}
    </svg>
  );
}
