import type { CompassProps, DimensionCode } from './types';
import { DEFAULT_SIZE, PADDING, CORE_RADIUS_RATIO, SEGMENT_ANGLES, DIVIDER_WIDTH } from './constants';
import { polarToCartesian } from './utils';
import { ReferenceRings } from './ReferenceRings';
import { GapIndicator } from './GapIndicator';
import { CompassSegment } from './CompassSegment';
import { CompassCore } from './CompassCore';
import { CompassLabels } from './CompassLabels';

const OUTER_DIMENSIONS: ReadonlyArray<Exclude<DimensionCode, 'core'>> = [
  'clarity',
  'connection',
  'collaboration',
];

/** Primary compass visualization component. Pure SVG, no external dependencies. */
export function Compass(props: CompassProps): React.JSX.Element {
  const {
    scores,
    selectedSegment = null,
    onSegmentClick,
    onSegmentHover,
    size = DEFAULT_SIZE,
    animated = false,
    showLabels = true,
    showGapIndicator = true,
    className,
  } = props;

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - PADDING;
  const coreRadius = maxRadius * CORE_RADIUS_RATIO;
  const labelRadius = maxRadius + 14;

  const coreScore = scores.find((s) => s.dimension === 'core');

  // Build aria-label summarizing all scores
  const ariaLabel = scores
    .map((s) => `${s.label}: ${Math.round(s.score)}%`)
    .join(', ');

  // Divider lines between segments
  const dividerAngles = OUTER_DIMENSIONS.map(
    (dim) => SEGMENT_ANGLES[dim].start,
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Culture Compass scores: ${ariaLabel}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Reference rings */}
      <ReferenceRings cx={cx} cy={cy} maxRadius={maxRadius} coreRadius={coreRadius} />

      {/* Gap indicator at 100% radius */}
      {showGapIndicator && (
        <GapIndicator cx={cx} cy={cy} radius={maxRadius} />
      )}

      {/* Outer segments */}
      {OUTER_DIMENSIONS.map((dim) => {
        const scoreData = scores.find((s) => s.dimension === dim);
        if (!scoreData) return null;
        return (
          <CompassSegment
            key={dim}
            dimension={dim}
            score={scoreData.score}
            color={scoreData.color}
            label={scoreData.label}
            cx={cx}
            cy={cy}
            maxRadius={maxRadius}
            coreRadius={coreRadius}
            selectedSegment={selectedSegment}
            animated={animated}
            onClick={onSegmentClick}
            onHover={onSegmentHover}
          />
        );
      })}

      {/* White divider lines between segments */}
      {dividerAngles.map((angle) => {
        const inner = polarToCartesian(cx, cy, coreRadius, angle);
        const outer = polarToCartesian(cx, cy, maxRadius, angle);
        return (
          <line
            key={angle}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#FFFFFF"
            strokeWidth={DIVIDER_WIDTH}
            aria-hidden="true"
          />
        );
      })}

      {/* Core circle */}
      {coreScore && (
        <CompassCore
          cx={cx}
          cy={cy}
          radius={coreRadius}
          color={coreScore.color}
          score={coreScore.score}
        />
      )}

      {/* External labels */}
      {showLabels && (
        <CompassLabels
          scores={scores}
          cx={cx}
          cy={cy}
          labelRadius={labelRadius}
        />
      )}
    </svg>
  );
}
