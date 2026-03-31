/**
 * DialogueTopicSidebar — vertical topic list for the desktop sidebar.
 * Mirrors the visual pattern of DimensionNavItem: left border highlight,
 * darker background for active state, response count badge.
 */

import type { ReactElement } from 'react';

export interface DialogueTopicSidebarProps {
  topics: Array<{ id: string; label: string; count: number }>;
  activeTopicId: string | null;
  onSelect: (topicId: string | null) => void;
}

/** Vertical topic navigation for the dialogue tab desktop sidebar. */
export function DialogueTopicSidebar({
  topics,
  activeTopicId,
  onSelect,
}: DialogueTopicSidebarProps): ReactElement {
  if (topics.length === 0) {
    return (
      <nav className="flex flex-col gap-1 py-2" aria-label="Topic navigation">
        <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">No topics available</p>
      </nav>
    );
  }

  const isAllActive = activeTopicId === null;

  return (
    <nav className="flex flex-col gap-1 py-2" aria-label="Topic navigation">
      {/* All Topics item */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
          isAllActive
            ? 'border-l-[3px] border-l-[var(--grey-700)] bg-[var(--grey-50)]'
            : 'hover:bg-[var(--grey-50)]'
        }`}
        aria-current={isAllActive ? 'true' : undefined}
      >
        <span className="text-sm font-medium text-[var(--grey-700)]">All Topics</span>
        <span className="shrink-0 rounded-full bg-[var(--grey-100)] px-2 py-0.5 text-xs font-medium text-[var(--grey-600)]">
          {topics.reduce((sum, t) => sum + t.count, 0)}
        </span>
      </button>

      {/* Individual topic items */}
      {topics.map((topic) => {
        const isActive = activeTopicId === topic.id;
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelect(topic.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
              isActive
                ? 'border-l-[3px] border-l-[var(--grey-700)] bg-[var(--grey-50)]'
                : 'hover:bg-[var(--grey-50)]'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="truncate text-sm font-medium text-[var(--grey-700)]">{topic.label}</span>
            <span className="shrink-0 rounded-full bg-[var(--grey-100)] px-2 py-0.5 text-xs font-medium text-[var(--grey-600)]">
              {topic.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
