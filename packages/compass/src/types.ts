export type DimensionCode = 'core' | 'clarity' | 'connection' | 'collaboration';

export interface DimensionScore {
  dimension: DimensionCode;
  score: number; // 0-100
  color: string; // hex
  label: string;
}

/**
 * Props for the Compass SVG visualization component.
 */
export interface CompassProps {
  /**
   * Scores for each of the four dimensions (Core, Clarity, Connection,
   * Collaboration). Order in the array does not matter — each entry is
   * keyed by `dimension`. Missing dimensions render as zero-fill segments.
   */
  scores: DimensionScore[];
  /**
   * Dimension code of the currently selected segment, or `null` for none.
   * The selected segment is rendered with emphasis styling; the others
   * are dimmed.
   */
  selectedSegment?: DimensionCode | null;
  /**
   * Invoked when the user clicks a segment. Use to drive drill-down into
   * the selected dimension's detail view.
   */
  onSegmentClick?: (dimension: DimensionCode) => void;
  onSegmentHover?: (dimension: DimensionCode | null) => void;
  size?: number;
  /**
   * When `true`, segments animate from zero to their target fill on mount
   * and transition between score changes. Respects `prefers-reduced-motion`.
   */
  animated?: boolean;
  showLabels?: boolean;
  /**
   * When `true`, overlays a visual indicator highlighting the largest gap
   * between adjacent dimension scores — the "weakest link" in the compass.
   */
  showGapIndicator?: boolean;
  className?: string;
}
