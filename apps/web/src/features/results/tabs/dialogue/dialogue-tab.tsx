/**
 * Dialogue tab — displays open-ended survey responses with keyword bubbles,
 * dimension filter pills, debounced search, and paginated response cards.
 * Filters combine with AND logic (keyword + dimension + search).
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import { useDialogueResponses } from '../../hooks/use-dialogue-responses';
import { useDialogueKeywords } from '../../hooks/use-dialogue-keywords';
import { useQuestionScores } from '../../hooks/use-question-scores';
import { useDialogueFilter } from '../../context/dialogue-filter-context';
import { KeywordBubbles, type Keyword } from './keyword-bubbles';
import { DialogueSearch } from './dialogue-search';
import { DimensionFilterPills, type DimensionFilter } from './dimension-filter-pills';
import { ResponseList } from './response-list';

interface DialogueTabProps {
  surveyId: string;
}

/** Dialogue tab — open-ended response explorer. */
export function DialogueTab({ surveyId }: DialogueTabProps): ReactElement {
  const { activeTopicId, setActiveTopicId } = useDialogueFilter();
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>(null);
  const [searchText, setSearchText] = useState('');

  const { data: allResponses, isLoading: responsesLoading, hasMore: responsesTruncated, cap: responsesCap } = useDialogueResponses({ surveyId });
  const { data: keywordData, isLoading: keywordsLoading } = useDialogueKeywords(surveyId);
  const { data: questionScores } = useQuestionScores({ surveyId });

  /** Map questionId → dimensionCode for filtering. */
  const questionDimensionMap = useMemo(() => {
    const map = new Map<string, DimensionCode>();
    if (questionScores) {
      for (const q of questionScores) {
        map.set(q.questionId, q.dimensionCode);
      }
    }
    return map;
  }, [questionScores]);

  const keywords: Keyword[] = useMemo(
    () => (keywordData ?? []).map((k) => ({ text: k.keyword, count: k.frequency })),
    [keywordData],
  );

  const filteredResponses = useMemo(() => {
    if (!allResponses) return [];
    let filtered = allResponses;

    if (activeTopicId !== null) {
      filtered = filtered.filter((r) => r.questionId === activeTopicId);
    }

    if (dimensionFilter !== null) {
      filtered = filtered.filter(
        (r) => questionDimensionMap.get(r.questionId) === dimensionFilter
      );
    }

    if (activeKeyword !== null) {
      const lower = activeKeyword.toLowerCase();
      filtered = filtered.filter((r) =>
        r.responseText.toLowerCase().includes(lower)
      );
    }

    if (searchText.length > 0) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.responseText.toLowerCase().includes(lower) ||
          r.questionText.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [allResponses, activeTopicId, dimensionFilter, activeKeyword, searchText, questionDimensionMap]);

  const clearFilters = useCallback(() => {
    setActiveTopicId(null);
    setActiveKeyword(null);
    setDimensionFilter(null);
    setSearchText('');
  }, [setActiveTopicId]);

  if (responsesLoading || (keywordsLoading && !allResponses)) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <KeywordBubbles
        keywords={keywords}
        activeKeyword={activeKeyword}
        onKeywordClick={setActiveKeyword}
      />

      <DimensionFilterPills active={dimensionFilter} onChange={setDimensionFilter} />

      <DialogueSearch value={searchText} onChange={setSearchText} />

      <ResponseList
        responses={filteredResponses}
        hasAnyResponses={(allResponses ?? []).length > 0}
        onClearFilters={clearFilters}
      />

      {responsesTruncated && (
        <p
          className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3 text-center text-xs text-[var(--text-secondary)]"
          role="note"
        >
          Showing the most recent {responsesCap.toLocaleString()} responses. Older
          responses are hidden — use search or dimension filters to narrow the list.
        </p>
      )}
    </div>
  );
}

/** Insights panel content for the Dialogue tab. */
export function DialogueInsightsContent(): ReactElement {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h3 className="text-sm font-semibold text-[var(--grey-900)]">About Dialogue</h3>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Open-ended feedback provides qualitative depth beyond numeric scores.
        Use keyword bubbles and filters to explore common patterns across responses.
        All feedback is structurally anonymous — no responses can be attributed to individuals.
      </p>
    </div>
  );
}

/** Loading skeleton for the dialogue tab. */
function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-16 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
      <div className="h-10 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
      <div className="h-10 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
        />
      ))}
    </div>
  );
}
