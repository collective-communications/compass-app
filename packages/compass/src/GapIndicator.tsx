import { memo } from 'react';

interface GapIndicatorProps {
  cx: number;
  cy: number;
  radius: number;
}

/** Dotted circle at 100% radius indicating the maximum possible score. */
export const GapIndicator = memo(function GapIndicator(
  props: GapIndicatorProps,
): React.JSX.Element {
  const { cx, cy, radius } = props;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill="none"
      stroke="#E5E4E0"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      aria-hidden="true"
    />
  );
});
