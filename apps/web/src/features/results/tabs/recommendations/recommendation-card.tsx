/**
 * RecommendationCard — displays a single recommendation with
 * a colored left border indicating severity level.
 */

import type { ReactElement } from 'react';
import type { Recommendation } from '../../types';
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type SeverityLevel,
} from '../../lib/severity-mapping';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

/** Dimension code to display label mapping. */
const DIMENSION_LABELS: Record<string, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
  system: 'System',
};

/** Individual recommendation card with severity-colored left border. */
export function RecommendationCard({
  recommendation,
}: RecommendationCardProps): ReactElement {
  const { severity, title, description, priority, dimensionCode } = recommendation;
  const borderColor = SEVERITY_COLORS[severity as SeverityLevel] ?? SEVERITY_COLORS.medium;
  const severityLabel = SEVERITY_LABELS[severity as SeverityLevel] ?? severity;

  return (
    <article
      className="relative rounded-lg border border-[#E5E4E0] bg-white p-6"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
      aria-label={`${severityLabel} severity: ${title}`}
    >
      {/* Priority badge */}
      <span
        className="absolute right-4 top-4 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F5F5F5] px-2 text-xs font-medium text-[#616161]"
        aria-label={`Priority ${priority}`}
      >
        #{priority}
      </span>

      {/* Dimension badge */}
      <span className="mb-2 inline-block rounded-full bg-[#F5F5F5] px-3 py-0.5 text-xs font-medium text-[#757575]">
        {DIMENSION_LABELS[dimensionCode] ?? dimensionCode}
      </span>

      <h3 className="mb-1 pr-12 text-base font-semibold text-[#212121]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#616161]">{description}</p>
    </article>
  );
}
