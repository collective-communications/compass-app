/**
 * Individual question result card.
 * Shows the question text, score percentage, Likert distribution bar,
 * and a reverse-scored indicator when applicable.
 */

import type { ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';
import { LikertBarChart } from '../../components/likert-bar-chart';
import { Card } from '../../../../components/ui/card';

interface QuestionResultCardProps {
  question: QuestionScoreRow;
  /** Hex color for the agree side of the Likert bar. */
  dimensionColor: string;
}

export function QuestionResultCard({
  question,
  dimensionColor,
}: QuestionResultCardProps): ReactElement {
  // Normalize raw Likert average (1-N) to 0-100% scale
  const scaleSize = Math.max(...Object.keys(question.distribution).map(Number));
  const scorePercent =
    scaleSize > 1
      ? Math.round(((question.meanScore - 1) / (scaleSize - 1)) * 100)
      : 0;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--grey-700)]">
            {question.questionText}
          </p>
          {question.isReverseScored && (
            <span
              className="inline-flex shrink-0 items-center rounded bg-[var(--grey-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
              title="Reverse-scored question"
            >
              (R)
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold text-[var(--grey-700)]">
          {scorePercent}%
        </span>
      </div>
      <LikertBarChart
        distribution={question.distribution}
        agreeColor={dimensionColor}
        height={20}
      />
    </Card>
  );
}
