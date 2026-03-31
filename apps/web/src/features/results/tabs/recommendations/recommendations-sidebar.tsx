/**
 * RecommendationsSidebar — numbered vertical priority list with severity dots.
 * Displayed in the desktop sidebar column of ResultsLayout.
 *
 * Visual pattern follows DimensionNavItem: left border + darker background
 * for the active state, compact items with supplementary indicators.
 */

import type { ReactElement } from 'react';
import type { SeverityLevel } from '../../lib/severity-mapping';

const SEVERITY_DOT: Record<SeverityLevel, string> = {
  critical: 'var(--severity-critical-border)',
  high: 'var(--severity-high-border)',
  medium: 'var(--severity-medium-border)',
  healthy: 'var(--severity-healthy-border)',
};

export interface RecommendationsSidebarProps {
  recommendations: Array<{ title: string; severity: string }>;
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Desktop sidebar: numbered vertical list of recommendations with severity dots. */
export function RecommendationsSidebar({
  recommendations,
  activeIndex,
  onSelect,
}: RecommendationsSidebarProps): ReactElement {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Recommendations sidebar">
      {recommendations.map((rec, i) => {
        const isActive = activeIndex === i;
        const dotColor = SEVERITY_DOT[rec.severity as SeverityLevel] ?? SEVERITY_DOT.medium;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
              isActive
                ? 'border-l-[3px] border-l-[var(--grey-700)] bg-[var(--grey-50)]'
                : 'hover:bg-[var(--grey-50)]'
            }`}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`Recommendation ${i + 1}: ${rec.title}`}
          >
            {/* Index badge */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-[var(--grey-700)] text-[var(--grey-50)]'
                  : 'bg-[var(--grey-100)] text-[var(--grey-700)]'
              }`}
            >
              {i + 1}
            </span>

            {/* Title — truncated */}
            <span className="flex-1 truncate text-sm font-medium text-[var(--grey-700)]">
              {rec.title}
            </span>

            {/* Severity dot */}
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
              aria-label={`${rec.severity} severity`}
            />
          </button>
        );
      })}
    </nav>
  );
}
