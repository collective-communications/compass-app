/**
 * Sparkline — last-N runs as a row of vertical bars.
 *
 * Used on the CI/CD workflows screen: one sparkline per workflow, showing
 * its last ~20 run statuses with semantic colours. SVG-free div approach
 * (CSS bars) — no chart lib.
 *
 * @module components/Sparkline
 */

import type { JSX } from 'preact';

export type SparkRunStatus = 'ok' | 'warn' | 'down' | 'unknown';

export interface SparkRun {
  status: SparkRunStatus;
  /** Optional title (run #, message) for hover tooltip. */
  title?: string;
}

export interface SparklineProps {
  runs: SparkRun[];
  /** Bar height in px (default 18). */
  height?: number;
}

/** Map status → bar-height percentage. Failures are shorter; running runs ambiguous. */
const HEIGHT_PCT: Record<SparkRunStatus, number> = {
  ok: 100,
  warn: 65,
  down: 40,
  unknown: 25,
};

export function Sparkline(props: SparklineProps): JSX.Element {
  const { runs, height = 18 } = props;
  return (
    <span class="sparkline" style={{ height: `${height}px` }} role="img" aria-label="Recent run history">
      {runs.map((r, i) => (
        <span
          key={i}
          class={`sparkline__bar sparkline__bar--${r.status}`}
          style={{ height: `${HEIGHT_PCT[r.status]}%` }}
          title={r.title}
        />
      ))}
    </span>
  );
}
