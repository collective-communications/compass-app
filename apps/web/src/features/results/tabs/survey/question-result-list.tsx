/**
 * Ordered list of question result cards for a single dimension.
 * Questions are displayed in the order received (pre-sorted by hook).
 */

import type { ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';
import { QuestionResultCard } from './question-result-card';

interface QuestionResultListProps {
  questions: QuestionScoreRow[];
  /** Hex color for the agree side of Likert bars. */
  dimensionColor: string;
}

export function QuestionResultList({
  questions,
  dimensionColor,
}: QuestionResultListProps): ReactElement {
  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--grey-400)]">
        No question results available for this dimension.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question) => (
        <QuestionResultCard
          key={question.questionId}
          question={question}
          dimensionColor={dimensionColor}
        />
      ))}
    </div>
  );
}
