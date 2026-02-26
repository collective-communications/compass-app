/** Angle ranges for each outer segment (degrees, clockwise from top/12 o'clock) */
export const SEGMENT_ANGLES = {
  clarity: { start: 210, end: 330 },
  connection: { start: 90, end: 210 },
  collaboration: { start: 330, end: 90 },
} as const;

/** Width of white divider lines between segments (px) */
export const DIVIDER_WIDTH = 3;

/** Duration for entry animation (ms) */
export const ANIMATION_DURATION = 600;

/** Reference ring positions as fraction of max radius */
export const REFERENCE_RINGS: readonly number[] = [0.45, 0.73];

/** Default compass size in px */
export const DEFAULT_SIZE = 344;

/** Core circle radius as a fraction of overall radius */
export const CORE_RADIUS_RATIO = 0.22;

/** Padding from SVG edge to max radius */
export const PADDING = 16;
