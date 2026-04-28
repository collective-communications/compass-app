/**
 * RunPill — status pill for a deploy run.
 *
 * One of: running, ok (success), down (failed), warn (warning), queued.
 * Renders a status dot + the canonical label. Uses semantic status colours
 * via the design tokens (`--status-ok / -warn / -down`, `--accent-dark`).
 *
 * @module components/RunPill
 */

import type { JSX } from 'preact';

export type RunPillStatus = 'running' | 'ok' | 'down' | 'warn' | 'queued';

export interface RunPillProps {
  status: RunPillStatus;
  /** Render a smaller variant. */
  sm?: boolean;
  /** Override the canonical label. */
  label?: string;
}

const LABELS: Record<RunPillStatus, string> = {
  running: 'running',
  ok: 'success',
  down: 'failed',
  warn: 'warning',
  queued: 'queued',
};

const DOT_CLASSES: Record<RunPillStatus, string> = {
  running: 'dot ring pulse',
  ok: 'dot',
  down: 'dot down',
  warn: 'dot warn',
  queued: 'dot unknown',
};

const TEXT_COLORS: Record<RunPillStatus, string> = {
  running: 'var(--accent-dark)',
  ok: 'var(--status-ok)',
  down: 'var(--status-down)',
  warn: 'var(--status-warn)',
  queued: 'var(--fg-tertiary)',
};

export function RunPill(props: RunPillProps): JSX.Element {
  const { status, sm, label } = props;
  const classes = ['run-pill', sm ? 'run-pill--sm' : ''].filter(Boolean).join(' ');
  return (
    <span class={classes} style={{ color: TEXT_COLORS[status] }}>
      <span class={DOT_CLASSES[status]} aria-hidden="true" />
      <span>{label ?? LABELS[status]}</span>
    </span>
  );
}
