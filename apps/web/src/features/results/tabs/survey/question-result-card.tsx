/**
 * Individual question result card.
 * Shows the question text, score percentage, Likert distribution bar,
 * and a reverse-scored indicator when applicable.
 */

import type { ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';
import { LikertBarChart } from '../../components/likert-bar-chart';

interface QuestionResultCardProps {
  question: QuestionScoreRow;
  /** Hex color for the agree side of the Likert bar. */
  dimensionColor: string;
}

export function QuestionResultCard({
  question,
  dimensionColor,
}: QuestionResultCardProps): ReactElement {
  const scorePercent = Math.round(question.meanScore * 100);

  return (
    <div className="rounded-lg border border-[#E5E4E0] bg-white p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#424242]">
            {question.questionText}
          </p>
          {question.isReverseScored && (
            <span
              className="inline-flex shrink-0 items-center rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#757575]"
              title="Reverse-scored question"
            >
              (R)
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold text-[#424242]">
          {scorePercent}%
        </span>
      </div>
      <LikertBarChart
        distribution={question.distribution}
        agreeColor={dimensionColor}
        height={20}
      />
    </div>
  );
}
