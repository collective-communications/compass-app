/**
 * Survey Dimensions tab — shows per-question results grouped by dimension.
 * Renders dimension pill navigation (Core, Clarity, Connection, Collaboration),
 * a header card with aggregate scores and sub-dimension breakdown,
 * and a list of question result cards grouped by sub-dimension.
 */

import { useState, useMemo, type ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import { dimensions as dimTokens } from '@compass/tokens';
import type { DimensionScoreMap, SubDimensionScore } from '@compass/scoring';
import { useQuestionScores } from '../../hooks/use-question-scores';
import { useOverallScores } from '../../hooks/use-overall-scores';
import { DimensionHeaderCard } from './dimension-header-card';
import { QuestionResultList } from './question-result-list';
import type { QuestionScoreRow } from '../../types';

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

/**
 * Derive sub-dimension scores from question-level data.
 * Groups questions by sub-dimension and computes average mean score,
 * converting to a 0-100 percentage scale.
 */
function deriveSubDimensionScores(
  questions: QuestionScoreRow[],
  dimensionCode: DimensionCode,
): SubDimensionScore[] {
  const groups = new Map<string, { name: string; scores: number[]; counts: number[] }>();

  for (const q of questions) {
    if (!q.subDimensionCode) continue;
    let group = groups.get(q.subDimensionCode);
    if (!group) {
      group = { name: q.subDimensionName ?? q.subDimensionCode, scores: [], counts: [] };
      groups.set(q.subDimensionCode, group);
    }
    group.scores.push(q.meanScore);
    group.counts.push(q.responseCount);
  }

  const results: SubDimensionScore[] = [];
  for (const [code, group] of groups) {
    const avgRaw = group.scores.reduce((sum, s) => sum + s, 0) / group.scores.length;
    const totalCount = group.counts.reduce((sum, c) => sum + c, 0);
    // meanScore from the view is already on the 1-N scale; convert to 0-100%
    // Determine scale from distribution keys of the first question in this group
    const sampleQ = questions.find((q) => q.subDimensionCode === code);
    const scaleSize = sampleQ ? Math.max(...Object.keys(sampleQ.distribution).map(Number)) : 5;
    const score = scaleSize > 1 ? ((avgRaw - 1) / (scaleSize - 1)) * 100 : 0;

    results.push({
      subDimensionCode: code,
      dimensionCode,
      score: Math.round(score * 100) / 100,
      rawScore: Math.round(avgRaw * 100) / 100,
      responseCount: totalCount,
    });
  }

  return results.sort((a, b) => a.subDimensionCode.localeCompare(b.subDimensionCode));
}

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

  const subDimensionScores = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    return deriveSubDimensionScores(questions, activeDimension);
  }, [questions, activeDimension]);

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
                    : 'text-[var(--text-secondary)] hover:bg-[var(--grey-50)]'
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
            subDimensionScores={subDimensionScores.length > 0 ? subDimensionScores : undefined}
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
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
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
