/**
 * Groups tab — segment analysis with anonymity threshold enforcement.
 *
 * When "All" is selected: shows the overall compass and a stacked comparison
 * chart across all segments for the selected type.
 *
 * When a specific segment is selected and above threshold: shows segment
 * header, side-by-side compass + top issues, delta chips, subculture alert,
 * and quick actions. Insights panel shows observations, compare grid, and
 * recommended action.
 *
 * When below threshold: hides data, shows anonymity warning.
 *
 * URL search params: segmentType, segmentValue.
 */

import { useState, useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { DimensionCode } from '@compass/types';
import type { SegmentType } from '@compass/scoring';
import { useOverallScores } from '../../hooks/use-overall-scores';
import { useSegmentScores } from '../../hooks/use-segment-scores';
import { useSegmentQuestionScores } from '../../hooks/use-segment-question-scores';
import { useRecommendations } from '../../hooks/use-recommendations';
import { ResultsSkeleton } from '../../components/results-skeleton';
import type { DimensionScoreRow } from '../../types';
import { SegmentFilterBar } from './segment-filter-bar';
import { SegmentCompass } from './segment-compass';
import { StackedComparisonChart } from './stacked-comparison-chart';
import { AnonymityWarning } from './anonymity-warning';
import { SegmentHeader } from './segment-header';
import { DimensionDeltaChips } from './dimension-delta-chips';
import { SubcultureAlert } from './subculture-alert';
import { QuickActions } from './quick-actions';
import { TopIssuesCard } from './top-issues-card';
import { ObservationsPanel } from './observations-panel';
import { CompareWithGrid } from './compare-with-grid';
import { RecommendedActionCard } from './recommended-action-card';
import { useSegmentValues } from './use-segment-values';
import {
  computeDimensionDeltas,
  hasSubcultureDeviation,
  deriveSegmentObservations,
  findWeakestDimension,
} from './lib/compute-deltas';

const ALL_VALUE = 'all';
const DEFAULT_SEGMENT_TYPE: SegmentType = 'department';

interface GroupsTabProps {
  surveyId: string;
  initialSegmentType?: SegmentType;
  initialSegmentValue?: string;
  /** Content rendered into the insights panel slot. Provided via render prop. */
  insightsRef?: (node: ReactElement | null) => void;
}

export function GroupsTab({ surveyId, initialSegmentType, initialSegmentValue }: GroupsTabProps): ReactElement {
  const navigate = useNavigate();
  const [segmentType, setSegmentType] = useState<SegmentType>(initialSegmentType ?? DEFAULT_SEGMENT_TYPE);
  const [segmentValue, setSegmentValue] = useState<string>(initialSegmentValue ?? ALL_VALUE);

  const isAllSelected = segmentValue === ALL_VALUE;

  // ── Data fetching ─────────────────────────────────────────────────────────

  /** Overall scores (always needed for comparison). */
  const { data: overallScores, isLoading: isOverallLoading } = useOverallScores(surveyId);

  /** All rows for the selected segment type (no value filter). */
  const { data: allSegmentRows, isLoading: isAllSegmentsLoading } = useSegmentScores({
    surveyId,
    segmentType,
  });

  /** Rows for the specific selected segment value (only when not "All"). */
  const { data: selectedSegmentRows, isLoading: isSelectedLoading } = useSegmentScores({
    surveyId,
    segmentType,
    segmentValue: isAllSelected ? undefined : segmentValue,
  });

  /** Per-question scores for the selected segment (anonymity-aware). */
  const { data: segmentQuestionScores } = useSegmentQuestionScores({
    surveyId,
    segmentType,
    segmentValue,
  });

  /** Transform overall DimensionScoreMap into DimensionScoreRow[] for compass rendering. */
  const overallRows = useMemo<DimensionScoreRow[]>(() => {
    if (!overallScores) return [];
    const dims: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];
    return dims
      .filter((dim) => overallScores[dim] !== undefined)
      .map((dim) => ({
        surveyId,
        segmentType: 'overall',
        segmentValue: 'all',
        dimensionCode: dim,
        isMasked: false,
        score: overallScores[dim].score,
        rawScore: overallScores[dim].rawScore,
        responseCount: overallScores[dim].responseCount,
      }));
  }, [overallScores, surveyId]);

  // ── Derived state ─────────────────────────────────────────────────────────

  /**
   * Distinct segment values and the below-anonymity-threshold subset.
   * Shared with {@link GroupsInsights} via {@link useSegmentValues}; TanStack
   * Query dedupes the underlying request so both components read the same
   * cached rows and compute the same memoized result.
   */
  const { segmentValues, belowThresholdValues } = useSegmentValues(allSegmentRows);

  /** Whether the currently selected segment is below anonymity threshold. */
  const isSelectedBelowThreshold = !isAllSelected && belowThresholdValues.has(segmentValue);

  /** Dimension deltas for the selected segment vs. organization average. */
  const deltas = useMemo(() => {
    if (!selectedSegmentRows || !overallScores || isAllSelected) return [];
    return computeDimensionDeltas(selectedSegmentRows, overallScores);
  }, [selectedSegmentRows, overallScores, isAllSelected]);

  /** Dimensions that deviate significantly from organization average. */
  const deviatingDimensions = useMemo(() => hasSubcultureDeviation(deltas), [deltas]);

  /** Response count from first non-masked row. */
  const responseCount = useMemo(() => {
    if (!selectedSegmentRows) return 0;
    return selectedSegmentRows.find((r) => !r.isMasked)?.responseCount ?? 0;
  }, [selectedSegmentRows]);

  // ── URL sync ────────────────────────────────────────────────────────────

  // Keep the `segmentType` / `segmentValue` search params in sync with local
  // state. Router-native navigation (with `replace: true`) preserves the
  // previous semantics — no new history entry — while letting TanStack
  // Router see the change and keep its own state consistent. When "All" is
  // selected we omit `segmentValue` so the URL stays clean.
  useEffect(() => {
    const search: Record<string, string> = { segmentType };
    if (segmentValue !== ALL_VALUE) {
      search.segmentValue = segmentValue;
    }
    void navigate({
      // TanStack Router's typed `search` reducer infers a narrow union
      // across the whole route tree; the segment-scoped params are only
      // valid on this specific route, so we cast to accept the structural
      // shape.
      search: search as never,
      replace: true,
    });
  }, [navigate, segmentType, segmentValue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTypeChange = useCallback((type: SegmentType) => {
    setSegmentType(type);
    setSegmentValue(ALL_VALUE);
  }, []);

  const handleValueChange = useCallback((value: string) => {
    setSegmentValue(value);
  }, []);

  const handleExportReport = useCallback(() => {
    // Hop from `/results/$surveyId/groups` to the sibling reports tab via
    // the router so we avoid a full page reload and preserve TanStack
    // Router's state.
    void navigate({ to: '/results/$surveyId/reports', params: { surveyId } });
  }, [navigate, surveyId]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isOverallLoading || isAllSegmentsLoading) {
    return <ResultsSkeleton />;
  }

  if (!overallScores || !allSegmentRows) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
        No segment data available.
      </p>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <SegmentFilterBar
        segmentType={segmentType}
        segmentValue={segmentValue}
        segmentValues={segmentValues}
        belowThresholdValues={belowThresholdValues}
        onTypeChange={handleTypeChange}
        onValueChange={handleValueChange}
      />

      {isAllSelected && (
        <>
          {/* Overall compass when no specific segment is selected */}
          <SegmentCompass rows={overallRows} className="mx-auto" />
          <StackedComparisonChart
            segmentRows={allSegmentRows}
            overallScores={overallScores}
            belowThresholdValues={belowThresholdValues}
          />
        </>
      )}

      {!isAllSelected && isSelectedBelowThreshold && (
        <AnonymityWarning segmentValue={segmentValue} />
      )}

      {!isAllSelected && !isSelectedBelowThreshold && (
        <>
          {isSelectedLoading ? (
            <ResultsSkeleton />
          ) : selectedSegmentRows && selectedSegmentRows.length > 0 ? (
            <div className="flex flex-col gap-6 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
              <SegmentHeader
                segmentValue={segmentValue}
                segmentType={segmentType}
                responseCount={responseCount}
              />

              {/* Side-by-side: compass + top issues */}
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_1fr]">
                <SegmentCompass rows={selectedSegmentRows} size={240} className="ml-8 lg:ml-12" />
                <TopIssuesCard
                  questions={segmentQuestionScores?.questions ?? []}
                  segmentLabel={segmentValue}
                />
              </div>

              <DimensionDeltaChips deltas={deltas} />

              {deviatingDimensions.length > 0 && (
                <SubcultureAlert
                  segmentLabel={segmentValue}
                  deviatingDimensions={deviatingDimensions}
                />
              )}

              <QuickActions
                segmentValue={segmentValue}
                segmentType={segmentType}
                segmentValues={segmentValues}
                onCompare={handleValueChange}
                onViewByType={handleTypeChange}
                onExportReport={handleExportReport}
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              No data available for this segment.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── GroupsInsights ──────────────────────────────────────────────────────────

interface GroupsInsightsProps {
  surveyId: string;
  segmentType: SegmentType;
  segmentValue: string;
  isBelowThreshold: boolean;
  onSegmentChange: (value: string) => void;
}

/**
 * Insights panel content for the Groups tab.
 * Shows observations, compare-with grid, and recommended action
 * when a specific above-threshold segment is selected.
 */
export function GroupsInsights({
  surveyId,
  segmentType,
  segmentValue,
  isBelowThreshold,
  onSegmentChange,
}: GroupsInsightsProps): ReactElement | null {
  // Fetch data — TanStack Query deduplicates with GroupsTab's calls
  const { data: overallScores } = useOverallScores(surveyId);
  const { data: segmentRows } = useSegmentScores({
    surveyId,
    segmentType,
    segmentValue: segmentValue || undefined,
  });
  const { data: allSegmentRows } = useSegmentScores({
    surveyId,
    segmentType,
  });
  const { data: recommendations } = useRecommendations(surveyId);

  const isAllSelected = !segmentValue || segmentValue === ALL_VALUE;

  // Shared derivation with GroupsTab — the TanStack Query cache means
  // `allSegmentRows` is the same reference in both callers, so this hook
  // returns the already-memoized values rather than recomputing.
  const { segmentValues, belowThresholdValues } = useSegmentValues(allSegmentRows);

  if (isAllSelected || isBelowThreshold) return null;

  // Compute observations and recommended action
  const deltas =
    segmentRows && overallScores
      ? computeDimensionDeltas(segmentRows, overallScores)
      : [];
  const observations = deriveSegmentObservations(deltas);
  const weakestDim = findWeakestDimension(deltas);
  const recommendedAction =
    weakestDim && recommendations
      ? recommendations.find((r) => r.dimensionCode === weakestDim) ?? null
      : null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        {segmentValue} Insights
      </h2>

      <ObservationsPanel observations={observations} />

      <CompareWithGrid
        segmentValues={segmentValues}
        currentValue={segmentValue}
        belowThresholdValues={belowThresholdValues}
        onSelect={onSegmentChange}
      />

      <RecommendedActionCard recommendation={recommendedAction} />
    </div>
  );
}
