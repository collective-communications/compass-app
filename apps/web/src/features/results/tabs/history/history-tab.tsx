/**
 * HistoryTab — Historical Trends tab for the results section.
 *
 * Shows dimension score progression across surveys with a SVG line chart,
 * per-dimension delta rows, and a survey timeline.
 *
 * Displayed at /results/$surveyId/history.
 */

import type { ReactElement } from 'react';
import { useHistoryTab } from '../../hooks/use-history-tab';
import type { SurveyDataPoint } from '../../hooks/use-history-tab';
import { TrendChart } from './trend-chart';
import { TrendIndicator } from '../../components/trend-indicator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryTabProps {
  surveyId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type DimensionId = 'core' | 'clarity' | 'connection' | 'collaboration';

const DIMENSION_ORDER: DimensionId[] = ['core', 'clarity', 'connection', 'collaboration'];

const DIMENSION_LABELS: Record<DimensionId, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

/** CSS custom property names injected by `@compass/tokens` `injectTokens()`. */
const DIMENSION_COLORS: Record<DimensionId, string> = {
  core: 'var(--color-core)',
  clarity: 'var(--color-clarity)',
  connection: 'var(--color-connection)',
  collaboration: 'var(--color-collaboration)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pulsing skeleton while data loads. */
function HistoryTabSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Chart skeleton */}
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-[var(--grey-100)]" />
        <div className="h-[260px] animate-pulse rounded bg-[var(--grey-100)]" />
      </div>

      {/* Dimension row skeletons */}
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <div className="flex flex-col gap-4">
          {DIMENSION_ORDER.map((dim) => (
            <div key={dim} className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--grey-100)]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--grey-100)]" />
              <div className="ml-auto h-4 w-12 animate-pulse rounded bg-[var(--grey-100)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Empty state when fewer than 2 surveys have data. */
function HistoryEmptyState(): ReactElement {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-sm rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-8 py-12 text-center">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Trend analysis becomes available after completing a second survey for this organisation.
        </p>
      </div>
    </div>
  );
}

interface DimensionDeltaRowProps {
  dimension: DimensionId;
  currentScore: number | undefined;
  delta: number | null;
}

function DimensionDeltaRow({ dimension, currentScore, delta }: DimensionDeltaRowProps): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2">
      {/* Color dot */}
      <svg width={8} height={8} aria-hidden="true" className="shrink-0">
        <circle cx={4} cy={4} r={4} fill={DIMENSION_COLORS[dimension]} />
      </svg>

      {/* Label */}
      <span className="flex-1 text-sm font-medium text-[var(--grey-900)]">
        {DIMENSION_LABELS[dimension]}
      </span>

      {/* Current score */}
      {currentScore !== undefined && (
        <span className="text-sm font-semibold tabular-nums text-[var(--grey-900)]">
          {Math.round(currentScore)}
        </span>
      )}

      {/* Delta badge */}
      <TrendIndicator delta={delta} size="sm" />
    </div>
  );
}

interface SurveyTimelineProps {
  surveys: SurveyDataPoint[];
}

function SurveyTimeline({ surveys }: SurveyTimelineProps): ReactElement {
  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--grey-900)]">Survey Timeline</h3>
      <ol className="flex flex-col gap-3">
        {surveys.map((s) => (
          <li
            key={s.surveyId}
            className="flex items-center gap-3"
          >
            {/* Timeline dot */}
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${s.isCurrent ? 'bg-[var(--color-interactive)]' : 'bg-[var(--grey-300)]'}`}
              aria-hidden="true"
            />

            {/* Survey title */}
            <span
              className={`flex-1 text-sm ${s.isCurrent ? 'font-semibold text-[var(--grey-900)]' : 'text-[var(--text-secondary)]'}`}
            >
              {s.title}
            </span>

            {/* Close date */}
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {new Date(s.closesAt).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'short',
              })}
            </span>

            {/* Current badge */}
            {s.isCurrent && (
              <span className="rounded-full bg-[var(--color-interactive)] px-2 py-0.5 text-xs font-medium text-white">
                Current
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Historical Trends tab body.
 * Renders the SVG trend chart, per-dimension delta rows, and survey timeline.
 */
export function HistoryTab({ surveyId }: HistoryTabProps): ReactElement {
  const { surveys, isLoading, hasEnoughData } = useHistoryTab(surveyId);

  if (isLoading) {
    return <HistoryTabSkeleton />;
  }

  if (!hasEnoughData) {
    return <HistoryEmptyState />;
  }

  // Identify the current survey for score/delta computation
  const currentSurvey = surveys.find((s) => s.isCurrent) ?? surveys[surveys.length - 1];
  const previousSurvey = surveys.length >= 2 ? surveys[surveys.length - 2] : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Trend chart card */}
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--grey-900)]">Score Trends</h2>
        <TrendChart surveys={surveys} />
      </div>

      {/* Dimension delta rows */}
      <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-6 py-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--grey-900)]">Dimension Changes</h3>
        <div
          className="divide-y divide-[var(--grey-100)]"
          role="list"
          aria-label="Dimension score changes"
        >
          {DIMENSION_ORDER.map((dim) => {
            const currentScore = currentSurvey?.scores[dim];
            const previousScore = previousSurvey?.scores[dim];
            const delta: number | null =
              currentScore !== undefined && previousScore !== undefined
                ? Math.round((currentScore - previousScore) * 10) / 10
                : null;

            return (
              <div key={dim} role="listitem">
                <DimensionDeltaRow
                  dimension={dim}
                  currentScore={currentScore}
                  delta={delta}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Survey timeline */}
      <SurveyTimeline surveys={surveys} />
    </div>
  );
}
