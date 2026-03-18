import { memo, useCallback } from 'react';
import type { DimensionCode } from './types';
import { describeArc, clampScore } from './utils';
import { SEGMENT_ANGLES, ANIMATION_DURATION } from './constants';

interface CompassSegmentProps {
  dimension: Exclude<DimensionCode, 'core'>;
  score: number;
  color: string;
  label: string;
  cx: number;
  cy: number;
  maxRadius: number;
  coreRadius: number;
  selectedSegment: DimensionCode | null | undefined;
  animated: boolean;
  onClick?: (dimension: DimensionCode) => void;
  onHover?: (dimension: DimensionCode | null) => void;
}

/** Individual pie-slice segment for an outer dimension. */
export const CompassSegment = memo(function CompassSegment(
  props: CompassSegmentProps,
): React.JSX.Element {
  const {
    dimension,
    score,
    color,
    label,
    cx,
    cy,
    maxRadius,
    coreRadius,
    selectedSegment,
    animated,
    onClick,
    onHover,
  } = props;

  const angles = SEGMENT_ANGLES[dimension];
  const clamped = clampScore(score);

  // Score maps to radius between coreRadius and maxRadius
  const scoreRadius = coreRadius + (clamped / 100) * (maxRadius - coreRadius);

  // Full-extent path (for hit area) and score path (for fill)
  const scorePath = describeArc(cx, cy, scoreRadius, angles.start, angles.end);
  const hitPath = describeArc(cx, cy, maxRadius, angles.start, angles.end);

  // Opacity based on selection state
  let opacity = 1.0;
  if (selectedSegment != null) {
    opacity = selectedSegment === dimension ? 1.0 : 0.6;
  }

  const handleClick = useCallback((): void => {
    onClick?.(dimension);
  }, [onClick, dimension]);

  const handleMouseEnter = useCallback((): void => {
    onHover?.(dimension);
  }, [onHover, dimension]);

  const handleMouseLeave = useCallback((): void => {
    onHover?.(null);
  }, [onHover]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(dimension);
      }
    },
    [onClick, dimension],
  );

  const transitionStyle: React.CSSProperties = animated
    ? { transition: `d ${ANIMATION_DURATION}ms ease-out, opacity 200ms ease` }
    : { transition: 'opacity 200ms ease' };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${Math.round(clamped)}%`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Invisible hit area covering full segment extent */}
      <path d={hitPath} fill="transparent" />
      {/* Visible score fill */}
      <path
        d={scorePath}
        fill={color}
        opacity={opacity}
        style={transitionStyle}
      />
    </g>
  );
});
