import { memo } from 'react';
import { greyscale } from '@compass/tokens';
import { REFERENCE_RINGS } from './constants';

interface ReferenceRingsProps {
  cx: number;
  cy: number;
  maxRadius: number;
  coreRadius: number;
}

/** Dashed reference rings at predefined positions between core and max radius. */
export const ReferenceRings = memo(function ReferenceRings(
  props: ReferenceRingsProps,
): React.JSX.Element {
  const { cx, cy, maxRadius, coreRadius } = props;

  return (
    <g aria-hidden="true">
      {REFERENCE_RINGS.map((ratio) => {
        const ringRadius = coreRadius + ratio * (maxRadius - coreRadius);
        return (
          <circle
            key={ratio}
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke={greyscale[100]}
            strokeWidth={1}
            strokeDasharray="6 4"
          />
        );
      })}
    </g>
  );
});
