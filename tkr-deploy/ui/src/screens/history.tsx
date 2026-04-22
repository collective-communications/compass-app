/**
 * History screen — deploy run timeline with expandable per-step detail.
 *
 * Promotes deploy history from a 5-row table on Overview to a first-class
 * screen. Fetches runs on mount, expands individual runs on click to show
 * step-level entries with error messages and retry capability.
 *
 * @module screens/history
 */

import type { JSX } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { RunSummary, ActivityLogEntry, DotStatus } from '../types.js';
import { apiFetch } from '../api.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { StatusDot } from '../components/StatusDot.js';
import { Skeleton } from '../components/Skeleton.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TO_DOT: Record<RunSummary['status'], DotStatus> = {
  success: 'healthy', failed: 'error', partial: 'warning',
  'in-progress': 'warning', 'dry-run': 'unknown',
};

const STEP_STATUS_TO_DOT: Record<ActivityLogEntry['status'], DotStatus> = {
  success: 'healthy', failed: 'error', skipped: 'unknown', 'dry-run': 'unknown',
};

const SEVERITY_MAP: Record<RunSummary['status'], CardSeverity> = {
  success: 'healthy', failed: 'error', partial: 'warning',
  'in-progress': 'warning', 'dry-run': undefined,
};

type CardSeverity = 'healthy' | 'warning' | 'error' | undefined;

function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(run: RunSummary): string {
  if (!run.finishedAt) return 'Running…';
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}

// Reused inline style fragments.
const S_SECONDARY: Record<string, string> = {
  color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)',
};
const S_MUTED: Record<string, string> = {
  color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)',
};
const S_VSTACK: Record<string, string> = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
};

// ---------------------------------------------------------------------------
// Run detail cache type
// ---------------------------------------------------------------------------

interface RunDetail { run: RunSummary; entries: ActivityLogEntry[] }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistoryScreen(): JSX.Element {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Map<string, RunDetail>>(() => new Map());
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [retryingStep, setRetryingStep] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // -- Fetch runs list -------------------------------------------------------

  const fetchRuns = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await apiFetch<{ runs: RunSummary[] }>(
        '/api/deploy/runs', { query: { limit: 50 }, signal },
      );
      setRuns(data.runs);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setRunsError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    fetchRuns(ac.signal);
    return () => ac.abort();
  }, [fetchRuns]);

  // -- Refresh ---------------------------------------------------------------

  const handleRefresh = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    await fetchRuns(ac.signal);
  }, [fetchRuns]);

  // -- Expand / collapse a run -----------------------------------------------

  const toggleRun = useCallback(async (runId: string): Promise<void> => {
    if (expandedRunId === runId) { setExpandedRunId(null); return; }
    setExpandedRunId(runId);
    if (detailCache.has(runId)) return;
    setDetailLoading(runId);
    try {
      const detail = await apiFetch<RunDetail>(
        `/api/deploy/runs/${encodeURIComponent(runId)}`,
      );
      setDetailCache((prev) => new Map(prev).set(runId, detail));
    } catch (err: unknown) {
      console.error('[history] Failed to load run detail:', err);
    } finally {
      setDetailLoading(null);
    }
  }, [expandedRunId, detailCache]);

  // -- Retry from step -------------------------------------------------------

  const handleRetry = useCallback(async (stepId: string): Promise<void> => {
    setRetryingStep(stepId);
    try {
      await apiFetch<void>('/api/deploy/resume', {
        method: 'POST', query: { from: stepId },
      });
      if (expandedRunId) {
        setDetailCache((prev) => { const n = new Map(prev); n.delete(expandedRunId); return n; });
        await handleRefresh();
      }
    } catch (err: unknown) {
      console.error('[history] Retry failed:', err);
    } finally {
      setRetryingStep(null);
    }
  }, [expandedRunId, handleRefresh]);

  // -- Render ----------------------------------------------------------------

  return (
    <div class="screen screen--history">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <h1 class="screen-heading" style={{ margin: 0 }}>History</h1>
        <Button variant="secondary" onClick={handleRefresh}>Refresh</Button>
      </div>

      {/* Loading skeleton */}
      {runsLoading && !runs && (
        <div style={S_VSTACK}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton height="1.2em" width="40%" />
              <div style={{ marginTop: 'var(--space-sm)' }}><Skeleton height="0.9em" width="70%" /></div>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {runsError && (
        <Card severity="error">
          <p style={{ margin: 0, color: 'var(--color-status-error)' }}>{runsError}</p>
        </Card>
      )}

      {/* Empty */}
      {runs && runs.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>No deploy history yet.</p>
      )}

      {/* Runs timeline */}
      {runs && runs.length > 0 && (
        <div class="runs-timeline" style={S_VSTACK}>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.runId;
            const detail = detailCache.get(run.runId);
            const loadingDetail = detailLoading === run.runId && !detail;

            return (
              <Card key={run.runId} severity={SEVERITY_MAP[run.status]}>
                <button
                  type="button"
                  onClick={() => toggleRun(run.runId)}
                  aria-expanded={isExpanded}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', width: '100%', flexWrap: 'wrap' }}
                >
                  <StatusDot status={STATUS_TO_DOT[run.status]} label={run.status} />
                  <span class={`trigger-chip trigger-chip--${run.trigger}`}>{run.trigger}</span>
                  <span style={S_SECONDARY}>{run.stepCount} step{run.stepCount !== 1 ? 's' : ''}</span>
                  <span style={S_SECONDARY}>{formatDuration(run)}</span>
                  <span style={{ ...S_MUTED, marginLeft: 'auto' }}>{formatRelativeTime(run.startedAt)}</span>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                    {loadingDetail && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        <Skeleton height="1em" width="80%" />
                        <Skeleton height="1em" width="60%" />
                        <Skeleton height="1em" width="70%" />
                      </div>
                    )}
                    {detail && detail.entries.length === 0 && (
                      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No step entries recorded.</p>
                    )}
                    {detail?.entries.map((entry, idx) => (
                      <div
                        key={entry.stepId ?? idx}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
                          padding: 'var(--space-sm) 0', flexWrap: 'wrap',
                          borderBottom: idx < detail.entries.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                      >
                        <StatusDot status={STEP_STATUS_TO_DOT[entry.status]} />
                        <span style={{ fontWeight: 500 }}>{entry.action}</span>
                        <span style={S_SECONDARY}>{entry.provider}</span>
                        {entry.durationMs != null && <span style={S_MUTED}>{(entry.durationMs / 1000).toFixed(1)}s</span>}
                        {entry.error && (
                          <div style={{ flexBasis: '100%', color: 'var(--color-status-error)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                            {entry.error}
                          </div>
                        )}
                        {entry.status === 'failed' && entry.stepId && (
                          <div style={{ flexBasis: '100%', marginTop: '4px' }}>
                            <Button variant="secondary" disabled={retryingStep === entry.stepId} onClick={() => entry.stepId ? handleRetry(entry.stepId) : undefined}>
                              Retry from here
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
