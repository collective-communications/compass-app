/**
 * Header card for a dimension in the Survey Dimensions tab.
 * Shows a score ring, question count, overall score, and
 * an aggregate Likert distribution bar across all questions.
 */

import type { ReactElement } from 'react';
import type { LikertDistribution, QuestionScoreRow } from '../../types';
import { ScoreRing } from '../compass/score-ring';
import { LikertBarChart } from '../../components/likert-bar-chart';

interface DimensionHeaderCardProps {
  /** Display name for the dimension (e.g., "Core"). */
  dimensionName: string;
  /** Overall score for this dimension as a percentage (0-100). */
  score: number;
  /** Hex color for this dimension. */
  color: string;
  /** All questions for this dimension (used to compute aggregate distribution). */
  questions: QuestionScoreRow[];
}

/** Sum Likert distributions across all questions into one aggregate. */
function aggregateDistribution(questions: QuestionScoreRow[]): LikertDistribution {
  const agg: LikertDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const q of questions) {
    agg[1] += q.distribution[1];
    agg[2] += q.distribution[2];
    agg[3] += q.distribution[3];
    agg[4] += q.distribution[4];
  }
  return agg;
}

export function DimensionHeaderCard({
  dimensionName,
  score,
  color,
  questions,
}: DimensionHeaderCardProps): ReactElement {
  const aggregate = aggregateDistribution(questions);

  return (
    <div className="rounded-lg border border-[#E5E4E0] bg-white p-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={score} color={color} size={64} strokeWidth={5} />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[#212121]">
            {dimensionName}
          </h3>
          <p className="text-sm text-[#757575]">
            {questions.length} question{questions.length !== 1 ? 's' : ''} &middot; Overall score: {Math.round(score)}%
          </p>
        </div>
      </div>
      <div className="mt-4">
        <LikertBarChart
          distribution={aggregate}
          agreeColor={color}
          height={28}
        />
      </div>
    </div>
  );
}
