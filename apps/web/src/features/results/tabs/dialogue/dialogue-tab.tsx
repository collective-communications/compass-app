/**
 * Dialogue tab — displays open-ended survey responses with keyword bubbles,
 * dimension filter pills, debounced search, and paginated response cards.
 * Filters combine with AND logic (keyword + dimension + search).
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import type { DimensionCode } from '@compass/types';
import { useDialogueResponses } from '../../hooks/use-dialogue-responses';
import { useQuestionScores } from '../../hooks/use-question-scores';
import type { DialogueResponse } from '../../types';
import { KeywordBubbles, type Keyword } from './keyword-bubbles';
import { DialogueSearch } from './dialogue-search';
import { DimensionFilterPills, type DimensionFilter } from './dimension-filter-pills';
import { TopicFilter, deriveTopics } from './topic-filter';
import { ResponseList } from './response-list';

/** Stop words excluded from keyword extraction. Hoisted to module scope to avoid re-creation per call. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'that', 'this', 'these',
  'those', 'i', 'we', 'you', 'they', 'he', 'she', 'my', 'our', 'your',
  'their', 'its', 'not', 'no', 'so', 'if', 'all', 'more', 'some', 'any',
  'very', 'just', 'about', 'up', 'out', 'when', 'what', 'how', 'which',
  'who', 'there', 'than', 'also', 'into', 'only', 'other', 'then',
  'them', 'me', 'him', 'her', 'us', 'like', 'get', 'make', 'one',
  'much', 'many', 'well', 'being', 'don', 'really', 'think', 'know',
]);

interface DialogueTabProps {
  surveyId: string;
}

/** Extract keyword frequencies from response texts. */
function extractKeywords(responses: DialogueResponse[]): Keyword[] {
  const counts = new Map<string, number>();

  for (const response of responses) {
    const words = response.responseText
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}

/** Dialogue tab — open-ended response explorer. */
export function DialogueTab({ surveyId }: DialogueTabProps): ReactElement {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>(null);
  const [searchText, setSearchText] = useState('');

  const { data: allResponses, isLoading: responsesLoading } = useDialogueResponses({ surveyId });
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

  const topics = useMemo(() => deriveTopics(allResponses ?? []), [allResponses]);
  const keywords = useMemo(() => extractKeywords(allResponses ?? []), [allResponses]);

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
  }, []);

  if (responsesLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <TopicFilter
        topics={topics}
        activeTopicId={activeTopicId}
        onTopicChange={setActiveTopicId}
      />

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
      <div className="h-16 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]" />
      <div className="h-10 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]" />
      <div className="h-10 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
        />
      ))}
    </div>
  );
}
