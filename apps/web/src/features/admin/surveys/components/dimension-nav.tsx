/**
 * Dimension navigation for the survey builder.
 * Desktop: vertical sidebar list (240px). Mobile: horizontal scrollable pills.
 * "All" option shows all questions; dimension selection filters to that dimension.
 */

import type { ReactElement } from 'react';
import type { Dimension } from '@compass/types';

interface DimensionNavProps {
  dimensions: Dimension[];
  activeDimensionId: string | null;
  onSelect: (dimensionId: string | null) => void;
  questionCounts: Record<string, number>;
}

export function DimensionNav({
  dimensions,
  activeDimensionId,
  onSelect,
  questionCounts,
}: DimensionNavProps): ReactElement {
  const totalCount = Object.values(questionCounts).reduce((sum, c) => sum + c, 0);

  return (
    <>
      {/* Mobile: horizontal scrollable pills */}
      <nav className="overflow-x-auto scrollbar-hide md:hidden">
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`whitespace-nowrap rounded-full px-4 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] ${
                activeDimensionId === null
                  ? 'bg-[var(--grey-900)] text-[var(--grey-50)]'
                  : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
              }`}
            >
              All ({totalCount})
            </button>
          </li>
          {dimensions.map((dim) => (
            <li key={dim.id}>
              <button
                type="button"
                onClick={() => onSelect(dim.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] ${
                  activeDimensionId === dim.id
                    ? 'bg-[var(--grey-900)] text-[var(--grey-50)]'
                    : 'text-[var(--grey-700)] hover:bg-[var(--grey-100)]'
                }`}
              >
                {dim.name} ({questionCounts[dim.id] ?? 0})
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop: vertical sidebar */}
      <nav className="hidden w-60 shrink-0 md:block">
        <ul className="flex flex-col gap-0.5">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] ${
                activeDimensionId === null
                  ? 'bg-[var(--grey-100)] font-medium text-[var(--grey-900)]'
                  : 'text-[var(--grey-700)] hover:bg-[var(--grey-50)]'
              }`}
            >
              <span>All Questions</span>
              <span className="text-xs text-[var(--text-secondary)]">{totalCount}</span>
            </button>
          </li>
          {dimensions.map((dim) => (
            <li key={dim.id}>
              <button
                type="button"
                onClick={() => onSelect(dim.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)] ${
                  activeDimensionId === dim.id
                    ? 'bg-[var(--grey-100)] font-medium text-[var(--grey-900)]'
                    : 'text-[var(--grey-700)] hover:bg-[var(--grey-50)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: dim.color }}
                  />
                  {dim.name}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {questionCounts[dim.id] ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
