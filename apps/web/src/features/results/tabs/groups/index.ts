/** Groups tab — barrel export. */

export { GroupsTab, GroupsInsights } from './groups-tab';
export { SegmentFilterBar } from './segment-filter-bar';
export { SegmentCompass } from './segment-compass';
export { SegmentComparisonCard } from './segment-comparison-card';
export { StackedComparisonChart } from './stacked-comparison-chart';
export { AnonymityWarning } from './anonymity-warning';
export { SegmentHeader } from './segment-header';
export { TopIssuesCard } from './top-issues-card';
export { DimensionDeltaChips } from './dimension-delta-chips';
export { SubcultureAlert } from './subculture-alert';
export { QuickActions } from './quick-actions';
export { ObservationsPanel } from './observations-panel';
export { CompareWithGrid } from './compare-with-grid';
export { RecommendedActionCard } from './recommended-action-card';

// Lib utilities
export {
  computeDimensionDeltas,
  hasSubcultureDeviation,
  deriveSegmentObservations,
  findWeakestDimension,
  SUBCULTURE_DEVIATION_THRESHOLD,
} from './lib/compute-deltas';
export type { DimensionDelta, SegmentObservation } from './lib/compute-deltas';
