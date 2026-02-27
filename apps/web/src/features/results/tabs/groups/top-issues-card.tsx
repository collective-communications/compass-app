/**
 * Top issues card — shows the 3 lowest-scoring questions for a segment.
 * Used in the insights panel when a specific segment is selected.
 */

import type { ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';

interface TopIssuesCardProps {
  questions: QuestionScoreRow[];
  /** Maximum number of issues to display. */
  limit?: number;
}

export function TopIssuesCard({ questions, limit = 3 }: TopIssuesCardProps): ReactElement {
  const sorted = [...questions]
    .sort((a, b) => a.meanScore - b.meanScore)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
        <h3 className="text-sm font-semibold text-[var(--grey-700)]">Top Issues</h3>
        <p className="mt-2 text-xs text-[var(--grey-500)]">No question data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <h3 className="mb-3 text-sm font-semibold text-[var(--grey-700)]">
        Top Issues
      </h3>
      <ol className="flex flex-col gap-3">
        {sorted.map((q, idx) => (
          <li key={q.questionId} className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--grey-50)] text-xs font-medium text-[var(--grey-500)]">
              {idx + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-[var(--grey-700)]">{q.questionText}</p>
              <p className="text-xs text-[var(--grey-500)]">
                Mean: {q.meanScore.toFixed(1)} / 4.0
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
