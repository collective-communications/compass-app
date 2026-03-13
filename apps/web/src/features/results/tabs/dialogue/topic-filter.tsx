/**
 * TopicFilter — horizontal scrollable pill bar for filtering dialogue
 * responses by open-ended question (topic). Interim implementation using
 * questions as topics; the Topic interface is forward-compatible with
 * NLP-backed theme analysis.
 */

import { useCallback, type ReactElement } from 'react';

export interface Topic {
  questionId: string;
  label: string;
  fullText: string;
  count: number;
}

interface TopicFilterProps {
  topics: Topic[];
  activeTopicId: string | null;
  onTopicChange: (topicId: string | null) => void;
}

/** Truncate text to ~32 chars at the nearest word boundary. */
function truncateLabel(text: string, maxLength = 32): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '\u2026';
}

/** Derive topics from dialogue responses grouped by question. */
export function deriveTopics(
  responses: Array<{ questionId: string; questionText: string }>,
): Topic[] {
  const grouped = new Map<string, { text: string; count: number }>();
  for (const r of responses) {
    const existing = grouped.get(r.questionId);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(r.questionId, { text: r.questionText, count: 1 });
    }
  }
  return Array.from(grouped.entries()).map(([questionId, { text, count }]) => ({
    questionId,
    label: truncateLabel(text),
    fullText: text,
    count,
  }));
}

/** Horizontal scrollable pill bar for topic filtering. */
export function TopicFilter({ topics, activeTopicId, onTopicChange }: TopicFilterProps): ReactElement {
  const handleClick = useCallback(
    (topicId: string | null) => {
      onTopicChange(activeTopicId === topicId ? null : topicId);
    },
    [activeTopicId, onTopicChange],
  );

  if (topics.length === 0) return <></>;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by topic">
      <button
        type="button"
        onClick={() => handleClick(null)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          activeTopicId === null
            ? 'bg-[var(--grey-900)] text-[var(--grey-50)]'
            : 'bg-[var(--grey-50)] text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
        }`}
      >
        All Topics
      </button>
      {topics.map((topic) => (
        <button
          key={topic.questionId}
          type="button"
          onClick={() => handleClick(topic.questionId)}
          title={topic.fullText}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTopicId === topic.questionId
              ? 'bg-[var(--grey-900)] text-[var(--grey-50)]'
              : 'bg-[var(--grey-50)] text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
          }`}
        >
          {topic.label} ({topic.count})
        </button>
      ))}
    </div>
  );
}
