export type DimensionCode = 'core' | 'clarity' | 'connection' | 'collaboration';

export interface DimensionScore {
  dimension: DimensionCode;
  score: number; // 0-100
  color: string; // hex
  label: string;
}

export interface CompassProps {
  scores: DimensionScore[];
  selectedSegment?: DimensionCode | null;
  onSegmentClick?: (dimension: DimensionCode) => void;
  onSegmentHover?: (dimension: DimensionCode | null) => void;
  size?: number;
  animated?: boolean;
  showLabels?: boolean;
  showGapIndicator?: boolean;
  className?: string;
}
