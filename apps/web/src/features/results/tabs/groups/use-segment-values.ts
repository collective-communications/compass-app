/**
 * Derive the segment-value lists shared by `GroupsTab` and `GroupsInsights`.
 *
 * Both the tab body and its insights panel need:
 *   1. the distinct segment values present for a given segment type
 *   2. the set of those values that fall below the anonymity threshold
 *
 * Before this hook existed, the derivation was duplicated in both
 * components. Centralizing it here keeps the threshold logic in one place
 * (the `safe_segment_scores` view sets `is_masked = true` below the
 * `minResponses` threshold; a value is hidden when it has no rows or every
 * row is masked) and lets the parent compute once, then pass the results
 * down as props.
 */

import { useMemo } from 'react';
import type { DimensionScoreRow } from '../../types';

/**
 * Result shape returned by {@link useSegmentValues}.
 */
export interface SegmentValuesResult {
  /** Distinct segment values present in `allSegmentRows`, sorted alphabetically. */
  segmentValues: string[];
  /** Segment values that fall below the anonymity threshold (all rows masked or missing). */
  belowThresholdValues: Set<string>;
}

/**
 * Derive distinct segment values and the below-anonymity-threshold subset
 * from the rows returned by the `safe_segment_scores` view.
 *
 * @param allSegmentRows - All rows for the active segment type (no value filter).
 *                         May be undefined while the query is still loading.
 * @returns `{ segmentValues, belowThresholdValues }`.
 */
export function useSegmentValues(
  allSegmentRows: DimensionScoreRow[] | undefined,
): SegmentValuesResult {
  /** Distinct segment values for the current type. */
  const segmentValues = useMemo<string[]>(() => {
    if (!allSegmentRows) return [];
    const unique = new Set<string>();
    for (const row of allSegmentRows) {
      unique.add(row.segmentValue);
    }
    return [...unique].sort();
  }, [allSegmentRows]);

  /**
   * Segment values that fall below the anonymity threshold.
   *
   * The `safe_segment_scores` view sets `is_masked = true` when the segment
   * has fewer responses than the configured minimum. A value is treated as
   * below-threshold when it either has no rows at all or all rows are
   * masked — both cases mean data must stay hidden.
   */
  const belowThresholdValues = useMemo<Set<string>>(() => {
    if (!allSegmentRows) return new Set();
    const belowSet = new Set<string>();

    // Group rows by segment value once so we can test each group cheaply.
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

  return { segmentValues, belowThresholdValues };
}
