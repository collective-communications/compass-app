/** Convert polar coordinates to SVG cartesian coordinates. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  // SVG: 0deg = top (12 o'clock), clockwise
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/** Generate an SVG arc path `d` attribute from startAngle to endAngle at given radius. */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  // Normalize sweep
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

/** Clamp a score value to 0-100 range. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
