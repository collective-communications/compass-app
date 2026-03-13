/**
 * Response list — renders filtered response cards with "Load more" pagination.
 * Shows 20 items per page. Handles empty states for no matches and no data.
 */

import { useState, type ReactElement } from 'react';
import type { DialogueResponse } from '../../types';
import { ResponseCard } from './response-card';

const PAGE_SIZE = 20;

interface ResponseListProps {
  responses: DialogueResponse[];
  hasAnyResponses: boolean;
  onClearFilters: () => void;
}

/** Paginated list of dialogue response cards. */
export function ResponseList({
  responses,
  hasAnyResponses,
  onClearFilters,
}: ResponseListProps): ReactElement {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = responses.slice(0, visibleCount);
  const hasMore = visibleCount < responses.length;

  if (!hasAnyResponses) {
    return (
      <div className="rounded-[10px] border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No open-ended responses were collected in this survey.
        </p>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="rounded-[10px] border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-10 text-center">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          No responses match your filters. Try adjusting your search or removing filters.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm font-medium text-[var(--grey-700)] underline hover:text-[var(--text-primary)]"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map((response) => (
        <ResponseCard key={response.id} response={response} />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className="mx-auto rounded-full border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-2 text-sm font-medium text-[var(--grey-700)] hover:bg-[var(--grey-50)]"
        >
          Load more
        </button>
      )}
    </div>
  );
}
