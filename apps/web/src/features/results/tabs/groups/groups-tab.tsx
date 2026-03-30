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

  /** Distinct segment values for the current type. */
  const segmentValues = useMemo<string[]>(() => {
    if (!allSegmentRows) return [];
    const unique = new Set<string>();
    for (const row of allSegmentRows) {
      unique.add(row.segmentValue);
    }
    return [...unique].sort();
  }, [allSegmentRows]);

  /** Segment values that fall below the anonymity threshold (score is null/0 with no data). */
  const belowThresholdValues = useMemo<Set<string>>(() => {
    if (!allSegmentRows) return new Set();
    const belowSet = new Set<string>();

    /** Group rows by segment value to check if ALL dimensions have null-equivalent scores. */
    const byValue = new Map<string, DimensionScoreRow[]>();
    for (const row of allSegmentRows) {
      let group = byValue.get(row.segmentValue);
      if (!group) {
        group = [];
        byValue.set(row.segmentValue, group);
      }
      group.push(row);
    }

    /**
     * The safe_segment_scores view sets is_masked = true when below threshold.
     * A segment is below threshold if it has no rows or all rows are masked.
     */
    for (const value of segmentValues) {
      const rows = byValue.get(value);
      if (!rows || rows.length === 0) {
        belowSet.add(value);
        continue;
      }
      const allMasked = rows.every((r) => r.isMasked);
      if (allMasked) {
        belowSet.add(value);
      }
    }

    return belowSet;
  }, [allSegmentRows, segmentValues]);

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

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('segmentType', segmentType);
    if (segmentValue === ALL_VALUE) {
      url.searchParams.delete('segmentValue');
    } else {
      url.searchParams.set('segmentValue', segmentValue);
    }
    window.history.replaceState(null, '', url.toString());
  }, [segmentType, segmentValue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTypeChange = useCallback((type: SegmentType) => {
    setSegmentType(type);
    setSegmentValue(ALL_VALUE);
  }, []);

  const handleValueChange = useCallback((value: string) => {
    setSegmentValue(value);
  }, []);

  const handleExportReport = useCallback(() => {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/groups$/, '/reports');
    window.location.href = url.toString();
  }, []);

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
            <>
              <SegmentHeader
                segmentValue={segmentValue}
                segmentType={segmentType}
                responseCount={responseCount}
              />

              {/* Side-by-side: compass + top issues */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <SegmentCompass rows={selectedSegmentRows} size={240} />
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
            </>
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

  // Derive segment values and below-threshold set from all-segments data
  const segmentValues = useMemo<string[]>(() => {
    if (!allSegmentRows) return [];
    const unique = new Set<string>();
    for (const row of allSegmentRows) {
      unique.add(row.segmentValue);
    }
    return [...unique].sort();
  }, [allSegmentRows]);

  const belowThresholdValues = useMemo<Set<string>>(() => {
    if (!allSegmentRows) return new Set();
    const belowSet = new Set<string>();
    const byValue = new Map<string, DimensionScoreRow[]>();
    for (const row of allSegmentRows) {
      let group = byValue.get(row.segmentValue);
      if (!group) {
        group = [];
        byValue.set(row.segmentValue, group);
      }
      group.push(row);
    }
    for (const value of segmentValues) {
      const rows = byValue.get(value);
      if (!rows || rows.length === 0 || rows.every((r) => r.isMasked)) {
        belowSet.add(value);
      }
    }
    return belowSet;
  }, [allSegmentRows, segmentValues]);

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
