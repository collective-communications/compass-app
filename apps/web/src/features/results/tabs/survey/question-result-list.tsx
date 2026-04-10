/**
 * Ordered list of question result cards for a single dimension.
 * Groups questions by sub-dimension when sub-dimension data is present.
 * Each group has a collapsible header showing the sub-dimension name and average score.
 */

import { useState, useMemo, type ReactElement } from 'react';
import type { QuestionScoreRow } from '../../types';
import { QuestionResultCard } from './question-result-card';

interface QuestionResultListProps {
  questions: QuestionScoreRow[];
  /** Hex color for the agree side of Likert bars. */
  dimensionColor: string;
}

/** A group of questions under a sub-dimension (or ungrouped). */
interface SubDimensionGroup {
  code: string | null;
  name: string;
  questions: QuestionScoreRow[];
  averageScore: number;
}

/**
 * Group questions by their sub-dimension code.
 * Questions without a sub-dimension are placed in an "Other" group at the end.
 */
function groupBySubDimension(questions: QuestionScoreRow[]): SubDimensionGroup[] {
  const grouped = new Map<string | null, QuestionScoreRow[]>();

  for (const q of questions) {
    const key = q.subDimensionCode;
    let group = grouped.get(key);
    if (!group) {
      group = [];
      grouped.set(key, group);
    }
    group.push(q);
  }

  const groups: SubDimensionGroup[] = [];
  for (const [code, qs] of grouped) {
    const avgScore = qs.reduce((sum, q) => sum + q.meanScore, 0) / qs.length;
    const name = code
      ? (qs[0]?.subDimensionName ?? code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : 'Other Questions';

    groups.push({
      code,
      name,
      questions: qs,
      averageScore: avgScore,
    });
  }

  // Sort: named sub-dimensions first (alphabetically), then "Other" last
  groups.sort((a, b) => {
    if (a.code === null) return 1;
    if (b.code === null) return -1;
    return a.name.localeCompare(b.name);
  });

  return groups;
}

export function QuestionResultList({
  questions,
  dimensionColor,
}: QuestionResultListProps): ReactElement {
  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
        No question results available for this dimension.
      </p>
    );
  }

  // Check if any questions have sub-dimension data
  const hasSubDimensions = questions.some((q) => q.subDimensionCode !== null);

  if (!hasSubDimensions) {
    // Flat list — no grouping needed (backward compat)
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

  // Grouped by sub-dimension
  const groups = groupBySubDimension(questions);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <SubDimensionSection
          key={group.code ?? '__other'}
          group={group}
          dimensionColor={dimensionColor}
        />
      ))}
    </div>
  );
}

/** Collapsible sub-dimension section with header and question cards. */
function SubDimensionSection({
  group,
  dimensionColor,
}: {
  group: SubDimensionGroup;
  dimensionColor: string;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(true);

  // Determine scale size from distribution keys
  const scaleSize = useMemo(() => {
    if (group.questions.length === 0) return 5;
    const first = group.questions[0]!;
    return Math.max(...Object.keys(first.distribution).map(Number));
  }, [group.questions]);

  // Convert average raw score to percentage
  const avgPercent = scaleSize > 1
    ? Math.round(((group.averageScore - 1) / (scaleSize - 1)) * 100)
    : 0;

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--grey-50)]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-90' : ''}`}
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--grey-900)]">
            {group.name}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            ({group.questions.length} question{group.questions.length !== 1 ? 's' : ''})
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-[var(--grey-700)]">
          {avgPercent}%
        </span>
      </button>
      {isOpen && (
        <div className="mt-2 flex flex-col gap-3 pl-2">
          {group.questions.map((question) => (
            <QuestionResultCard
              key={question.questionId}
              question={question}
              dimensionColor={dimensionColor}
            />
          ))}
        </div>
      )}
    </section>
  );
}
