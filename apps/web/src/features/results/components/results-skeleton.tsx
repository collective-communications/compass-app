/**
 * Loading skeleton for the results layout.
 * Matches the card-based layout with animate-pulse grey rectangles.
 */

import type { ReactElement } from 'react';

function SkeletonCard({ className = '' }: { className?: string }): ReactElement {
  return (
    <div
      className={`animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 ${className}`}
    >
      <div className="mb-4 h-4 w-1/3 rounded bg-[var(--grey-100)]" />
      <div className="mb-2 h-3 w-full rounded bg-[var(--grey-100)]" />
      <div className="mb-2 h-3 w-5/6 rounded bg-[var(--grey-100)]" />
      <div className="h-3 w-2/3 rounded bg-[var(--grey-100)]" />
    </div>
  );
}

export function ResultsSkeleton(): ReactElement {
  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      {/* Main content area */}
      <div className="flex flex-col gap-4 lg:w-[65%]">
        {/* Pill nav skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="h-8 w-24 animate-pulse rounded-full bg-[var(--grey-100)]"
            />
          ))}
        </div>

        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>

      {/* Insights panel skeleton */}
      <div className="flex flex-col gap-4 lg:w-[35%]">
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-32" />
      </div>
    </div>
  );
}
