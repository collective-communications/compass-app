/**
 * RecommendationNav — horizontal pill bar for navigating between
 * individual recommendations. Replaces the previous severity filter.
 */

import type { ReactElement } from 'react';
import type { Recommendation } from '../../types';
import {
  SEVERITY_COLORS,
  type SeverityLevel,
} from '../../lib/severity-mapping';

interface RecommendationNavProps {
  recommendations: Recommendation[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Horizontal pill navigation — one pill per recommendation. */
export function RecommendationNav({
  recommendations,
  activeIndex,
  onSelect,
}: RecommendationNavProps): ReactElement {
  return (
    <nav className="overflow-x-auto scrollbar-hide" aria-label="Recommendation navigation">
      <ul className="flex items-center gap-1">
        {recommendations.map((rec, i) => {
          const isActive = activeIndex === i;
          const dotColor = SEVERITY_COLORS[rec.severity as SeverityLevel] ?? SEVERITY_COLORS.medium;
          return (
            <li key={rec.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                    : 'text-[var(--grey-500)] hover:bg-[var(--grey-50)]'
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Recommendation ${i + 1}: ${rec.title}`}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: dotColor }}
                  aria-hidden="true"
                />
                {rec.title.length > 28 ? `${rec.title.slice(0, 26)}…` : rec.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
