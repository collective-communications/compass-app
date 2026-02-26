/**
 * Survey Dimensions tab — shows per-question results grouped by dimension.
 * Renders dimension pill navigation (Core, Clarity, Connection, Collaboration),
 * a header card with aggregate scores, and a list of question result cards.
 */

import { useState, useMemo, type ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
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
  { code: 'core', label: 'Core', color: '#0A3B4F' },
  { code: 'clarity', label: 'Clarity', color: '#FF7F50' },
  { code: 'connection', label: 'Connection', color: '#9FD7C3' },
  { code: 'collaboration', label: 'Collaboration', color: '#E8B4A8' },
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
                    ? 'bg-[#424242] text-white'
                    : 'text-[#757575] hover:bg-[#F5F5F5]'
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

/** Inline loading skeleton matching the tab layout. */
function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 animate-pulse rounded-lg border border-[#E5E4E0] bg-white" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-[#E5E4E0] bg-white"
        />
      ))}
    </div>
  );
}
