/**
 * Header card for a dimension in the Survey Dimensions tab.
 * Shows a score ring, question count, overall score,
 * an aggregate Likert distribution bar across all questions,
 * and an optional sub-dimension score breakdown.
 */

import type { ReactElement } from 'react';
import type { SubDimensionScore } from '@compass/scoring';
import type { LikertDistribution, QuestionScoreRow } from '../../types';
import { createEmptyDistribution } from '../../types';
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
  /** Number of points on the Likert scale. */
  scaleSize?: number;
  /** Sub-dimension scores for this dimension, if available. */
  subDimensionScores?: SubDimensionScore[];
}

/** Sum Likert distributions across all questions into one aggregate. */
function aggregateDistribution(
  questions: QuestionScoreRow[],
  scaleSize: number,
): LikertDistribution {
  const agg = createEmptyDistribution(scaleSize);
  for (const q of questions) {
    for (let i = 1; i <= scaleSize; i++) {
      agg[i] = (agg[i] ?? 0) + (q.distribution[i] ?? 0);
    }
  }
  return agg;
}

export function DimensionHeaderCard({
  dimensionName,
  score,
  color,
  questions,
  scaleSize = 5,
  subDimensionScores,
}: DimensionHeaderCardProps): ReactElement {
  const aggregate = aggregateDistribution(questions, scaleSize);
  const hasSubDimensions = subDimensionScores && subDimensionScores.length > 0;

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={score} color={color} size={64} strokeWidth={5} />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[var(--grey-900)]">
            {dimensionName}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {questions.length} question{questions.length !== 1 ? 's' : ''} &middot; Overall score: {Math.round(score)}%
          </p>
        </div>
      </div>
      <div className="mt-4">
        <LikertBarChart
          distribution={aggregate}
          agreeColor={color}
          scaleSize={scaleSize}
          height={28}
        />
      </div>

      {/* Sub-dimension breakdown — only rendered when data exists */}
      {hasSubDimensions && (
        <div className="mt-4 border-t border-[var(--grey-100)] pt-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Sub-dimensions
          </h4>
          <ul className="flex flex-col gap-2">
            {subDimensionScores.map((sub) => (
              <SubDimensionBar
                key={sub.subDimensionCode}
                code={sub.subDimensionCode}
                score={sub.score}
                color={color}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compact horizontal progress bar for a single sub-dimension score. */
function SubDimensionBar({
  code,
  score,
  color,
}: {
  code: string;
  score: number;
  color: string;
}): ReactElement {
  const clampedScore = Math.max(0, Math.min(100, score));
  /** Convert code like "trust_safety" to "Trust Safety" */
  const displayName = code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <li className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs font-medium text-[var(--grey-700)]" title={displayName}>
        {displayName}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--grey-100)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${clampedScore}%`,
            backgroundColor: color,
          }}
          role="progressbar"
          aria-valuenow={Math.round(clampedScore)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${displayName}: ${Math.round(clampedScore)}%`}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--grey-600)]">
        {Math.round(clampedScore)}%
      </span>
    </li>
  );
}
