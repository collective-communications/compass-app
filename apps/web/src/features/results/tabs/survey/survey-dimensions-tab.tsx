/**
 * Survey Dimensions tab — shows per-question results grouped by dimension.
 * Renders dimension pill navigation (Core, Clarity, Connection, Collaboration),
 * a header card with aggregate scores, and a list of question result cards.
 */

import { useState, useMemo, type ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import { dimensions as dimTokens } from '@compass/tokens';
import type { DimensionScoreMap } from '@compass/scoring';
import { useQuestionScores } from '../../hooks/use-question-scores';
import { useOverallScores } from '../../hooks/use-overall-scores';
import { DimensionHeaderCard } from './dimension-header-card';
import { QuestionResultList } from './question-result-list';

interface SurveyDimensionsTabProps {
  surveyId: string;
}

/** Dimension metadata for navigation pills. */
interface DimensionMeta {
  code: DimensionCode;
  label: string;
  color: string;
}

const DIMENSIONS: DimensionMeta[] = [
  { code: 'core', label: dimTokens.core.label, color: dimTokens.core.color },
  { code: 'clarity', label: dimTokens.clarity.label, color: dimTokens.clarity.color },
  { code: 'connection', label: dimTokens.connection.label, color: dimTokens.connection.color },
  { code: 'collaboration', label: dimTokens.collaboration.label, color: dimTokens.collaboration.color },
];

export function SurveyDimensionsTab({
  surveyId,
}: SurveyDimensionsTabProps): ReactElement {
  const [activeDimension, setActiveDimension] = useState<DimensionCode>('core');

  const activeMeta = DIMENSIONS.find((d) => d.code === activeDimension) ?? DIMENSIONS[0]!;

  const { data: questions, isLoading: questionsLoading } = useQuestionScores({
    surveyId,
    dimensionCode: activeDimension,
  });

  const { data: overallScores, isLoading: scoresLoading } = useOverallScores(surveyId);

  const dimensionScore = useMemo(() => {
    if (!overallScores?.[activeDimension]) return 0;
    return overallScores[activeDimension].score;
  }, [overallScores, activeDimension]);

  const isLoading = questionsLoading || scoresLoading;

  return (
    <div className="flex flex-col gap-4">
      {/* Dimension pill navigation */}
      <nav className="overflow-x-auto scrollbar-hide" aria-label="Dimension navigation">
        <ul className="flex items-center gap-1">
          {DIMENSIONS.map((dim) => (
            <li key={dim.code}>
              <button
                type="button"
                onClick={() => setActiveDimension(dim.code)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                  activeDimension === dim.code
                    ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                    : 'text-[var(--grey-500)] hover:bg-[var(--grey-50)]'
                }`}
                aria-current={activeDimension === dim.code ? 'true' : undefined}
              >
                {dim.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <DimensionHeaderCard
            dimensionName={activeMeta.label}
            score={dimensionScore}
            color={activeMeta.color}
            questions={questions ?? []}
          />
          <QuestionResultList
            questions={questions ?? []}
            dimensionColor={activeMeta.color}
          />
        </>
      )}
    </div>
  );
}

/** Severity label styling for dimension score ranges. */
const SCORE_LABELS: Array<{ min: number; label: string; className: string }> = [
  { min: 3.5, label: 'Healthy', className: 'bg-green-50 text-green-700' },
  { min: 2.5, label: 'Moderate', className: 'bg-yellow-50 text-yellow-700' },
  { min: 1.5, label: 'Needs attention', className: 'bg-orange-50 text-orange-700' },
  { min: 0, label: 'Critical', className: 'bg-red-50 text-red-700' },
];

function getScoreLabel(score: number): { label: string; className: string } {
  return SCORE_LABELS.find((s) => score >= s.min) ?? SCORE_LABELS[SCORE_LABELS.length - 1]!;
}

/** Insights panel content for the Survey Dimensions tab — dimension score summary list. */
export function SurveyInsightsContent({
  scores,
}: {
  scores: DimensionScoreMap;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h3 className="text-sm font-semibold text-[var(--grey-900)]">Dimension Scores</h3>
      <ul className="flex flex-col gap-3">
        {DIMENSIONS.map((dim) => {
          const dimScore = scores[dim.code]?.score ?? 0;
          const { label, className } = getScoreLabel(dimScore);
          return (
            <li
              key={dim.code}
              className="flex items-center justify-between rounded-lg border border-[var(--grey-100)] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: dim.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-[var(--grey-900)]">{dim.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums text-[var(--grey-700)]">
                  {dimScore.toFixed(1)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs leading-relaxed text-[var(--grey-500)]">
        Select a dimension above to explore individual question scores and response distributions.
      </p>
    </div>
  );
}

/** Inline loading skeleton matching the tab layout. */
function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}
