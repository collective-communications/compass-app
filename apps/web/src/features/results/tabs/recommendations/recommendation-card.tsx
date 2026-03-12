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
  const { severity, title, body, actions, cccServiceLink, trustLadderLink, priority, dimensionCode } = recommendation;
  const borderColor = SEVERITY_COLORS[severity as SeverityLevel] ?? SEVERITY_COLORS.medium;
  const severityLabel = SEVERITY_LABELS[severity as SeverityLevel] ?? severity;

  return (
    <article
      className="relative rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
      aria-label={`${severityLabel} severity: ${title}`}
    >
      {/* Priority badge */}
      <span
        className="absolute right-4 top-4 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--grey-50)] px-2 text-xs font-medium text-[var(--grey-500)]"
        aria-label={`Priority ${priority}`}
      >
        #{priority}
      </span>

      {/* Dimension badge */}
      <span className="mb-2 inline-block rounded-full bg-[var(--grey-50)] px-3 py-0.5 text-xs font-medium text-[var(--grey-500)]">
        {DIMENSION_LABELS[dimensionCode] ?? dimensionCode}
      </span>

      <h3 className="mb-1 pr-12 text-base font-semibold text-[var(--grey-900)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--grey-500)]">{body}</p>

      {actions.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[var(--grey-700)]">
          {actions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ol>
      )}

      {(cccServiceLink || trustLadderLink) && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {cccServiceLink && (
            <a
              href={cccServiceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-core)] hover:underline"
            >
              CC+C Service
            </a>
          )}
          {trustLadderLink && (
            <a
              href={trustLadderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-core)] hover:underline"
            >
              Trust Ladder
            </a>
          )}
        </div>
      )}
    </article>
  );
}
