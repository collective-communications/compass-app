/**
 * TrendChart — pure SVG line chart for historical dimension score trends.
 *
 * Renders 4 polylines (one per dimension) over a 0-100 score axis.
 * No external charting dependencies — all geometry is hand-rolled.
 */

import type { ReactElement } from 'react';
import type { SurveyDataPoint } from '../../hooks/use-history-tab';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendChartProps {
  /** Surveys already sorted ascending by closesAt. */
  surveys: SurveyDataPoint[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_W = 600;
const VIEW_H = 260;

const MARGIN = { left: 52, right: 16, top: 16, bottom: 48 };

/** Plot-area bounds derived from margins. */
const PLOT = {
  x0: MARGIN.left,
  x1: VIEW_W - MARGIN.right,
  y0: MARGIN.top,
  y1: VIEW_H - MARGIN.bottom,
} as const;

const PLOT_W = PLOT.x1 - PLOT.x0;
const PLOT_H = PLOT.y1 - PLOT.y0;

/** Y-axis grid lines at these score values. */
const Y_TICKS = [0, 25, 50, 75, 100] as const;

/** Canonical dimension order. */
const DIMENSIONS = ['core', 'clarity', 'connection', 'collaboration'] as const;

type DimensionId = (typeof DIMENSIONS)[number];

const DIMENSION_LABELS: Record<DimensionId, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

/** CSS custom properties injected by `@compass/tokens` `injectTokens()`. */
const DIMENSION_COLORS: Record<DimensionId, string> = {
  core: 'var(--color-core)',
  clarity: 'var(--color-clarity)',
  connection: 'var(--color-connection)',
  collaboration: 'var(--color-collaboration)',
};

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/** Map a 0-100 score to an SVG y-coordinate (inverted: 100 = top). */
function scoreToY(score: number): number {
  return PLOT.y1 - (score / 100) * PLOT_H;
}

/** Map a survey index (0-based) to an SVG x-coordinate. */
function indexToX(index: number, total: number): number {
  if (total <= 1) return PLOT.x0 + PLOT_W / 2;
  return PLOT.x0 + (index / (total - 1)) * PLOT_W;
}

/** Format an ISO date string as "Apr '24". */
function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const month = d.toLocaleString('en-CA', { month: 'short' });
  const year = String(d.getFullYear()).slice(2);
  return `${month} '${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GridProps {
  surveyCount: number;
}

function Grid({ surveyCount }: GridProps): ReactElement {
  return (
    <g aria-hidden="true">
      {/* Y-axis grid lines */}
      {Y_TICKS.map((tick) => {
        const y = scoreToY(tick);
        return (
          <line
            key={tick}
            x1={PLOT.x0}
            y1={y}
            x2={PLOT.x1}
            y2={y}
            stroke="var(--grey-100)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        );
      })}

      {/* Y-axis labels */}
      {Y_TICKS.map((tick) => {
        const y = scoreToY(tick);
        return (
          <text
            key={tick}
            x={PLOT.x0 - 6}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize={11}
          >
            {tick}
          </text>
        );
      })}

      {/* Y-axis line */}
      <line
        x1={PLOT.x0}
        y1={PLOT.y0}
        x2={PLOT.x0}
        y2={PLOT.y1}
        stroke="var(--grey-300)"
        strokeWidth={1}
      />

      {/* X-axis line */}
      <line
        x1={PLOT.x0}
        y1={PLOT.y1}
        x2={PLOT.x1}
        y2={PLOT.y1}
        stroke="var(--grey-300)"
        strokeWidth={1}
      />

      {/* X-axis tick stubs */}
      {Array.from({ length: surveyCount }, (_, i) => {
        const x = indexToX(i, surveyCount);
        return (
          <line
            key={i}
            x1={x}
            y1={PLOT.y1}
            x2={x}
            y2={PLOT.y1 + 4}
            stroke="var(--grey-300)"
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

interface XLabelsProps {
  surveys: SurveyDataPoint[];
}

function XLabels({ surveys }: XLabelsProps): ReactElement {
  return (
    <g aria-hidden="true">
      {surveys.map((s, i) => {
        const x = indexToX(i, surveys.length);
        const y = PLOT.y1 + 8;
        return (
          <text
            key={s.surveyId}
            x={x}
            y={y}
            textAnchor="end"
            dominantBaseline="hanging"
            fill="var(--text-secondary)"
            fontSize={11}
            transform={`rotate(-35, ${x}, ${y})`}
          >
            {formatDate(s.closesAt)}
          </text>
        );
      })}
    </g>
  );
}

interface DimensionLineProps {
  dimension: DimensionId;
  surveys: SurveyDataPoint[];
}

/**
 * Renders a polyline for a single dimension, connecting only surveys where
 * a score exists. Gaps (missing data) break the line into separate segments.
 */
function DimensionLine({ dimension, surveys }: DimensionLineProps): ReactElement {
  const color = DIMENSION_COLORS[dimension];
  const n = surveys.length;

  // Build consecutive segments: a new segment starts after every gap.
  const segments: Array<Array<{ x: number; y: number; survey: SurveyDataPoint }>> = [];
  let current: Array<{ x: number; y: number; survey: SurveyDataPoint }> = [];

  for (let i = 0; i < n; i++) {
    const survey: SurveyDataPoint | undefined = surveys[i];
    if (!survey) continue;
    const score = survey.scores[dimension];
    if (score !== undefined) {
      current.push({ x: indexToX(i, n), y: scoreToY(score), survey });
    } else {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
  }
  if (current.length >= 2) segments.push(current);

  // Collect all data points (for dots — even single isolated ones)
  const allPoints: Array<{ x: number; y: number; survey: SurveyDataPoint }> = [];
  for (let i = 0; i < n; i++) {
    const survey: SurveyDataPoint | undefined = surveys[i];
    if (!survey) continue;
    const score = survey.scores[dimension];
    if (score !== undefined) {
      allPoints.push({ x: indexToX(i, n), y: scoreToY(score), survey });
    }
  }

  return (
    <g>
      {/* Line segments */}
      {segments.map((seg, si) => {
        const points = seg.map(({ x, y }) => `${x},${y}`).join(' ');
        return (
          <polyline
            key={si}
            points={points}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}

      {/* Data point dots */}
      {allPoints.map(({ x, y, survey }) => {
        const score = survey.scores[dimension] as number;
        const isCurrent = survey.isCurrent;
        const label = `${DIMENSION_LABELS[dimension]}: ${score} — ${formatDate(survey.closesAt)}`;
        return (
          <circle
            key={survey.surveyId}
            cx={x}
            cy={y}
            r={isCurrent ? 6 : 4}
            fill={color}
            stroke={isCurrent ? 'white' : 'none'}
            strokeWidth={isCurrent ? 2 : 0}
            role="img"
          >
            <title>{label}</title>
          </circle>
        );
      })}
    </g>
  );
}

interface LegendProps {
  readonly dimensions: readonly DimensionId[];
}

function Legend({ dimensions: dims }: LegendProps): ReactElement {
  return (
    <div
      className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2"
      aria-label="Chart legend"
    >
      {dims.map((dim) => (
        <div key={dim} className="flex items-center gap-1.5">
          <svg width={12} height={12} aria-hidden="true">
            <rect
              width={12}
              height={12}
              rx={2}
              fill={DIMENSION_COLORS[dim]}
            />
          </svg>
          <span
            className="text-xs text-[var(--text-secondary)]"
          >
            {DIMENSION_LABELS[dim]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Pure SVG line chart showing dimension score progression across surveys.
 * Renders 4 coloured polylines — one per compass dimension — on a 0-100 Y axis.
 */
export function TrendChart({ surveys }: TrendChartProps): ReactElement {
  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Dimension score trends over time"
      >
        <title>Dimension score trends over time</title>

        <Grid surveyCount={surveys.length} />
        <XLabels surveys={surveys} />

        {DIMENSIONS.map((dim) => (
          <DimensionLine key={dim} dimension={dim} surveys={surveys} />
        ))}
      </svg>

      <Legend dimensions={DIMENSIONS} />
    </div>
  );
}
