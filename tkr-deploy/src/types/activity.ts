/**
 * Activity log entry — one JSONL line per orchestrator event written to
 * `tkr-deploy/activity.json`. Readers must tolerate v1 entries (no runId /
 * trigger / kind) until the one-shot migration runs.
 */
export interface ActivityLogEntry {
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Step id (for kind 'step') or synthetic action id ('run:start' etc. for kind 'start'/'end'). */
  action: string;
  /** Provider id — 'core' for orchestrator-level entries. */
  provider: string;
  /** Terminal status of the entry. 'dry-run' is used for preview runs that skipped execution. */
  status: 'success' | 'skipped' | 'failed' | 'dry-run';
  /** Execution duration in ms (absent for 'start'/'end' markers). */
  durationMs?: number;
  /** Error message when status === 'failed'. */
  error?: string;
  /** Run identifier — required for v2+ entries, optional for forward-compat readers. */
  runId?: string;
  /** What initiated the run this entry belongs to. */
  trigger?: 'full' | 'step' | 'resume' | 'dry-run';
  /** Entry position within its run — markers bracket step entries. */
  kind?: 'start' | 'step' | 'end';
  /** Step id when {@link kind} is 'step' — convenient for grouping. */
  stepId?: string;
}
