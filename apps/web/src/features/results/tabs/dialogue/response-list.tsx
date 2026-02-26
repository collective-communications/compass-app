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
      <div className="rounded-[10px] border border-[#E5E4E0] bg-white px-6 py-10 text-center">
        <p className="text-sm text-[#757575]">
          No open-ended responses were collected in this survey.
        </p>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#E5E4E0] bg-white px-6 py-10 text-center">
        <p className="mb-3 text-sm text-[#757575]">
          No responses match your filters. Try adjusting your search or removing filters.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm font-medium text-[#424242] underline hover:text-[#212121]"
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
          className="mx-auto rounded-full border border-[#E5E4E0] bg-white px-6 py-2 text-sm font-medium text-[#424242] hover:bg-[#F5F5F5]"
        >
          Load more
        </button>
      )}
    </div>
  );
}
