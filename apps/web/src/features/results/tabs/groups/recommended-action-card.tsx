/**
 * Recommended action card — shows a targeted intervention for the segment's weakest area.
 * Rendered in the insights panel when a specific segment is selected.
 */

import type { ReactElement } from 'react';
import type { Recommendation } from '../../types';

interface RecommendedActionCardProps {
  /** The recommendation to display, or null if none available. */
  recommendation: Recommendation | null;
}

export function RecommendedActionCard({ recommendation }: RecommendedActionCardProps): ReactElement | null {
  if (!recommendation) return null;

  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Recommended Action
      </h4>
      <div className="rounded-md border border-[#2E7D32] bg-[#EBF7F2] p-4">
        <p className="text-xs font-semibold uppercase text-[#2E7D32]">
          Targeted Intervention
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
          {recommendation.title}
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {recommendation.body}
        </p>
      </div>
    </div>
  );
}
