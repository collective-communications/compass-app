/**
 * Top issues card — shows the lowest-scoring questions for a segment.
 * Used in the insights panel when a specific segment is selected.
 *
 * Severity indicators:
 *  - Index 0 (worst): red (#B71C1C / critical)
 *  - Index 1+: orange (#E65100 / high)
 */

import type { ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';

interface TopIssuesCardProps {
  questions: QuestionScoreRow[];
  /** Label for the segment (e.g. "Engineering"). Shown in the heading when provided. */
  segmentLabel?: string;
  /** Maximum number of issues to display. */
  limit?: number;
}

/** Derive the scale maximum from distribution keys (fallback to 5). */
function inferScaleMax(distribution: Record<number, number>): number {
  const keys = Object.keys(distribution).map(Number);
  return keys.length > 0 ? Math.max(...keys) : 5;
}

export function TopIssuesCard({ questions, segmentLabel, limit = 3 }: TopIssuesCardProps): ReactElement {
  const heading = segmentLabel
    ? `Top ${limit} Issues for ${segmentLabel}`
    : 'Top Issues';

  const sorted = [...questions]
    .sort((a, b) => a.meanScore - b.meanScore)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          {heading}
        </h3>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">No question data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {heading}
      </h3>
      <ol className="flex flex-col gap-3">
        {sorted.map((q, idx) => {
          const scaleMax = inferScaleMax(q.distribution);
          const severityColor = idx === 0 ? 'bg-[#B71C1C]' : 'bg-[#E65100]';

          return (
            <li key={q.questionId} className="flex items-start gap-2">
              <span
                className={`mt-1 size-3 shrink-0 rounded-full ${severityColor}`}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm text-[var(--grey-700)]">{q.questionText}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Scored {q.meanScore.toFixed(1)} out of {scaleMax.toFixed(1)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
