import { memo } from 'react';

interface CompassCoreProps {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  score: number;
}

/** Center circle displaying the Core dimension score. */
export const CompassCore = memo(function CompassCore(
  props: CompassCoreProps,
): React.JSX.Element {
  const { cx, cy, radius, color, score } = props;

  return (
    <g aria-label={`Core: ${Math.round(score)}%`}>
      {/* Filled circle */}
      <circle cx={cx} cy={cy} r={radius} fill={color} />
      {/* White border */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      {/* CORE label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="#FFFFFF"
        fontSize={11}
        fontWeight={700}
        fontFamily="sans-serif"
        letterSpacing="0.05em"
      >
        CORE
      </text>
      {/* Score percentage */}
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="#FFFFFF"
        fontSize={16}
        fontWeight={700}
        fontFamily="sans-serif"
      >
        {Math.round(score)}%
      </text>
    </g>
  );
});
