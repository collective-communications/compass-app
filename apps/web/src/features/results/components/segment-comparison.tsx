/**
 * Segment comparison component showing dimension scores per segment
 * with delta indicators and anonymity threshold enforcement.
 */

interface SegmentScore {
  segmentLabel: string;
  dimensionCode: string;
  score: number;
  overallScore: number;
  isBelowThreshold: boolean;
}

interface SegmentComparisonProps {
  segments: SegmentScore[];
  anonymityMessage?: string;
  /** Likert scale size (e.g. 5 for a 1-5 scale). Defaults to 5. */
  scaleSize?: number;
}

export function SegmentComparison({ segments, anonymityMessage = 'Not enough responses to display this segment.', scaleSize = 5 }: SegmentComparisonProps): React.ReactNode {
  return (
    <div data-testid="segment-comparison" role="region" aria-label="Segment comparison">
      {segments.map((seg, i) => {
        if (seg.isBelowThreshold) {
          return (
            <div
              key={i}
              data-testid="segment-hidden"
              className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-secondary)]"
              role="status"
            >
              <span className="font-medium">{seg.segmentLabel}</span>
              <p className="mt-1">{anonymityMessage}</p>
            </div>
          );
        }

        const delta = seg.score - seg.overallScore;
        const deltaSign = delta >= 0 ? '+' : '';
        const range = scaleSize - 1;
        const deltaPercent = range > 0 ? Math.round((delta / range) * 100) : 0;

        return (
          <div
            key={i}
            data-testid="segment-row"
            className="flex items-center justify-between rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-4"
          >
            <span className="font-medium text-[var(--grey-900)]">{seg.segmentLabel}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-[var(--grey-700)]">{seg.score.toFixed(1)}</span>
              <span
                data-testid="delta-indicator"
                className={`text-xs font-semibold tabular-nums ${delta >= 0 ? 'text-[var(--severity-healthy-text)]' : 'text-[var(--severity-critical-text)]'}`}
              >
                {deltaSign}{deltaPercent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
