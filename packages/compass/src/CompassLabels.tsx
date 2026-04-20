import { memo } from 'react';
import { greyscale, textColors } from '@compass/tokens';
import type { DimensionScore } from './types';
import { SEGMENT_ANGLES } from './constants';
import { polarToCartesian } from './utils';

interface CompassLabelsProps {
  scores: DimensionScore[];
  cx: number;
  cy: number;
  labelRadius: number;
}

/** External labels positioned outside each outer segment. */
export const CompassLabels = memo(function CompassLabels(
  props: CompassLabelsProps,
): React.JSX.Element {
  const { scores, cx, cy, labelRadius } = props;

  const outerScores = scores.filter(
    (s): s is DimensionScore & { dimension: 'clarity' | 'connection' | 'collaboration' } =>
      s.dimension !== 'core',
  );

  return (
    <g aria-hidden="true">
      {outerScores.map((s) => {
        const angles = SEGMENT_ANGLES[s.dimension];
        // Place label at the midpoint angle of the segment
        let midAngle = (angles.start + angles.end) / 2;
        // Handle wrap-around for collaboration (330 -> 90)
        if (angles.end < angles.start) {
          midAngle = (angles.start + angles.end + 360) / 2;
          if (midAngle >= 360) midAngle -= 360;
        }
        const pos = polarToCartesian(cx, cy, labelRadius, midAngle);

        return (
          <g key={s.dimension}>
            <text
              x={pos.x}
              y={pos.y - 7}
              textAnchor="middle"
              dominantBaseline="auto"
              fill={greyscale[700]}
              fontSize={11}
              fontWeight={600}
              fontFamily="sans-serif"
              style={{ textTransform: 'uppercase' }}
            >
              {s.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + 9}
              textAnchor="middle"
              dominantBaseline="auto"
              fill={textColors.tertiary.light}
              fontSize={13}
              fontWeight={700}
              fontFamily="sans-serif"
            >
              {Math.round(s.score)}%
            </text>
          </g>
        );
      })}
    </g>
  );
});
