/**
 * DeployScreen — run-centric homepage (Direction D).
 *
 * Layout, top to bottom:
 *
 * 1. Current-run banner — pinned live view of the in-progress (or most
 *    recently completed) run, with streaming step pills, an elapsed clock,
 *    and a Caveat annotation describing the running step.
 *
 * 2. Deploy controls — Deploy + Preview buttons. Disabled when the vault
 *    is locked or a run is currently in progress.
 *
 * 3. Run feed — reverse-chronological list of recent runs with FacetChip
 *    strips (Vault → Supabase → Vercel → Resend → GitHub) showing what
 *    each run touched. Failed runs explode inline with their step errors
 *    and a "✦ likely fix" CTA wired to the secrets-sync endpoint.
 *
 * Data sources:
 *   - {@link deployState$}  — live SSE stream for the banner
 *   - {@link vault$}        — vault lock state for CTA gating
 *   - `/api/deploy/runs?limit=20` — initial feed
 *   - `/api/deploy/runs/:runId`   — entries for a clicked run
 *   - `/api/secrets` (POST)       — "likely fix" sync action
 *
 * @module screens/deploy
 */

import type { JSX } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { effect } from '@preact/signals';
import { deployState$ } from '../stores/deploy.js';
import type { CurrentRun, DeployStepState } from '../stores/deploy.js';
import { vault$ } from '../stores/vault.js';
import { apiFetch } from '../api.js';
import type { ActivityLogEntry, RunSummary } from '../types.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { Skeleton } from '../components/Skeleton.js';
import { RunPill, type RunPillStatus } from '../components/RunPill.js';
import { FacetChip, type FacetProvider, type FacetStatus } from '../components/FacetChip.js';
import { Annotation } from '../components/Annotation.js';
import { MobileNotifBanner } from '../shell/MobileNotifBanner.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';

// ---------------------------------------------------------------------------
// Tick hook — drives live elapsed clocks. Re-renders every `ms`.
// ---------------------------------------------------------------------------

function useTick(ms = 1000): void {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(startIso: string, endMs?: number): string {
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) return '';
  const end = endMs ?? Date.now();
  const sec = Math.max(0, Math.floor((end - startMs) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return 'just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortRun(runId: string): string {
  return `#${runId.length >= 4 ? runId.slice(-4) : runId}`;
}

function runStatusToPill(status: RunSummary['status']): RunPillStatus {
  switch (status) {
    case 'in-progress': return 'running';
    case 'success': return 'ok';
    case 'partial': return 'warn';
    case 'failed': return 'down';
    case 'dry-run': return 'queued';
  }
}

const PROVIDER_TO_FACET: Record<string, FacetProvider | undefined> = {
  vault: 'Vault',
  supabase: 'Supabase',
  vercel: 'Vercel',
  resend: 'Resend',
  github: 'GitHub',
};

/** Derive the FacetChip strip from a run's activity entries. */
function facetsFromEntries(entries: ActivityLogEntry[]): Array<{ provider: FacetProvider; status: FacetStatus; change?: string }> {
  const byProvider = new Map<FacetProvider, { status: FacetStatus; count: number }>();
  for (const e of entries) {
    if (e.kind === 'start' || e.kind === 'end') continue;
    const facet = PROVIDER_TO_FACET[e.provider.toLowerCase()];
    if (!facet) continue;
    const prev = byProvider.get(facet);
    const next: FacetStatus =
      e.status === 'failed' ? 'down' :
      e.status === 'skipped' ? 'skipped' :
      'ok';
    // Worst-status wins (down > running > skipped > ok)
    const order: Record<FacetStatus, number> = { down: 4, running: 3, skipped: 2, queued: 1, ok: 0 };
    const winner = !prev || order[next] > order[prev.status] ? next : prev.status;
    byProvider.set(facet, { status: winner, count: (prev?.count ?? 0) + 1 });
  }
  const ORDER: FacetProvider[] = ['Vault', 'Supabase', 'Vercel', 'Resend', 'GitHub'];
  return ORDER
    .filter((p) => byProvider.has(p))
    .map((p) => {
      const v = byProvider.get(p)!;
      return { provider: p, status: v.status, change: `${v.count} step${v.count === 1 ? '' : 's'}` };
    });
}

/** Extract the first failed step + its error from a run's entries. */
function firstFailure(entries: ActivityLogEntry[]): ActivityLogEntry | null {
  return entries.find((e) => e.status === 'failed' && e.kind !== 'start' && e.kind !== 'end') ?? null;
}

// ---------------------------------------------------------------------------
// DeployScreen
// ---------------------------------------------------------------------------

export function DeployScreen(): JSX.Element {
  const isMobile = useIsMobile();
  const { currentRun } = deployState$.value;
  const vaultState = vault$.value;
  const isRunning = currentRun !== null && !currentRun.frozen;
  const vaultLocked = vaultState.status !== 'healthy';

  const handleDeploy = useCallback(async () => {
    await apiFetch('/api/deploy', { method: 'POST' });
  }, []);
  const handlePreview = useCallback(async () => {
    await apiFetch('/api/deploy', { method: 'POST', query: { dryRun: '1' } });
  }, []);

  if (isMobile) {
    return (
      <MobileOverview
        currentRun={currentRun}
        vaultLocked={vaultLocked}
        isRunning={isRunning}
        onDeploy={handleDeploy}
        onPreview={handlePreview}
      />
    );
  }

  return (
    <div class="screen screen--overview">
      <CurrentRunBanner currentRun={currentRun} />

      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
        <Button
          variant="primary"
          disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Trigger a full deploy'}
          onClick={handleDeploy}
        >
          Deploy
        </Button>
        <Button
          variant="secondary"
          disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Preview deploy (dry run)'}
          onClick={handlePreview}
        >
          Preview
        </Button>
        {vaultLocked && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-warn)' }}>
            Vault locked — unlock to deploy
          </span>
        )}
      </div>

      <RunFeed currentRunId={currentRun?.runId ?? null} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileOverview — "is my push green?" layout for < 768px
// ---------------------------------------------------------------------------

function MobileOverview(props: {
  currentRun: CurrentRun | null;
  vaultLocked: boolean;
  isRunning: boolean;
  onDeploy: () => Promise<void>;
  onPreview: () => Promise<void>;
}): JSX.Element {
  const { currentRun, vaultLocked, isRunning, onDeploy, onPreview } = props;
  // Tick — even when no live run, the banner relative time still re-renders on theme toggle.
  useTick(1000);

  const banner = currentRun ? mobileBannerFor(currentRun) : null;

  return (
    <div class="screen screen--overview">
      {banner && (
        <MobileNotifBanner
          title={banner.title}
          description={banner.description}
          time={banner.time}
          glyph={banner.glyph}
        />
      )}

      {currentRun && (
        <Card>
          <MobileLiveProgress currentRun={currentRun} />
        </Card>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <Button
          variant="primary"
          disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Trigger a full deploy'}
          onClick={onDeploy}
        >
          Deploy
        </Button>
        <Button
          variant="secondary"
          disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Preview deploy (dry run)'}
          onClick={onPreview}
        >
          Preview
        </Button>
      </div>

      <RunFeed currentRunId={currentRun?.runId ?? null} />
    </div>
  );
}

function mobileBannerFor(run: CurrentRun): {
  title: string;
  description?: string;
  time?: string;
  glyph: string;
} {
  const failed = run.steps.find((s) => s.status === 'failed');
  const isRunning = !run.frozen;
  const verb = isRunning ? 'started' : failed ? 'failed' : 'completed';
  const glyph = failed ? '✗' : isRunning ? '▶' : '✓';
  const currentStep = isRunning ? run.steps.find((s) => s.status === 'running') : null;
  const description = failed
    ? failed.label
    : currentStep
      ? currentStep.label
      : run.trigger;
  const time = formatRelative(run.startedAt);
  return {
    title: `Run ${shortRun(run.runId)} ${verb}`,
    description,
    time,
    glyph,
  };
}

function MobileLiveProgress(props: { currentRun: CurrentRun }): JSX.Element {
  const { currentRun } = props;
  const total = currentRun.steps.length;
  const done = currentRun.steps.filter(
    (s) => s.status === 'success' || s.status === 'dry-run' || s.status === 'failed',
  ).length;
  const failed = currentRun.steps.find((s) => s.status === 'failed');
  const elapsed = formatElapsed(
    currentRun.startedAt,
    currentRun.finishedAt ? Date.parse(currentRun.finishedAt) : undefined,
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 'var(--space-sm)' }}>
        <span class="mono" style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>
          {shortRun(currentRun.runId)}
        </span>
        <span style={{ fontWeight: 500 }}>
          {done}/{total} steps
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-tertiary)', fontSize: 12 }} class="mono">
          {elapsed}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 12,
          background: 'var(--bg-muted)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: failed ? 'var(--status-down)' : 'var(--accent-dark)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <ul class="section__list" style={{ margin: 0 }}>
        {currentRun.steps.map((s) => {
          const dotCls =
            s.status === 'running' ? 'dot ring pulse' :
            s.status === 'failed' ? 'dot down' :
            s.status === 'success' ? 'dot' :
            'dot unknown';
          const color =
            s.status === 'running' ? 'var(--accent-dark)' :
            s.status === 'failed' ? 'var(--status-down)' :
            s.status === 'success' ? 'var(--status-ok)' :
            'var(--fg-tertiary)';
          return (
            <li key={s.stepId} class="section__list-row">
              <span class="section__list-label">
                <span class={dotCls} aria-hidden="true" />
                <span style={{ color, fontWeight: 500 }}>{s.label}</span>
                <span style={{ color: 'var(--fg-tertiary)' }}>· {s.provider}</span>
              </span>
              <span class="section__list-meta">
                {s.durationMs !== undefined ? `${(s.durationMs / 1000).toFixed(1)}s` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CurrentRunBanner — pinned live view of the in-progress / latest run
// ---------------------------------------------------------------------------

function CurrentRunBanner(props: { currentRun: CurrentRun | null }): JSX.Element {
  const { currentRun } = props;
  // Always tick — banner sometimes shows live elapsed; harmless when frozen.
  useTick(1000);

  if (!currentRun) {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 class="screen-heading" style={{ margin: 0 }}>Runs</h1>
          <Annotation size="md">~ trigger a deploy or push to GitHub</Annotation>
        </div>
        <p style={{ margin: 'var(--space-sm) 0 0', color: 'var(--fg-tertiary)' }}>
          No active run.
        </p>
      </Card>
    );
  }

  const isRunning = !currentRun.frozen;
  const failed = currentRun.steps.find((s) => s.status === 'failed');
  const status: RunPillStatus = isRunning
    ? 'running'
    : failed
      ? 'down'
      : currentRun.trigger === 'dry-run'
        ? 'queued'
        : 'ok';

  const elapsed = formatElapsed(
    currentRun.startedAt,
    currentRun.finishedAt ? Date.parse(currentRun.finishedAt) : undefined,
  );

  const currentStep = isRunning
    ? currentRun.steps.find((s) => s.status === 'running')
    : null;

  const severity = failed ? 'error' : isRunning ? undefined : 'healthy';

  return (
    <Card severity={severity}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span class="mono" style={{ color: 'var(--fg-tertiary)', fontSize: 13 }}>
          {shortRun(currentRun.runId)}
        </span>
        <RunPill status={status} />
        <span style={{ color: 'var(--fg-tertiary)', fontSize: 13 }}>
          {currentRun.trigger}
        </span>
        <span style={{ color: 'var(--fg-tertiary)', fontSize: 13 }}>
          · elapsed <span class="mono">{elapsed}</span>
        </span>
        {currentStep && (
          <Annotation size="md">
            ~ {currentStep.label.toLowerCase()}…
          </Annotation>
        )}
      </div>

      {currentRun.steps.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <StepPills steps={currentRun.steps} />
        </div>
      )}

      {failed && (
        <div
          class="left-bar-down"
          style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--status-down-bg)',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-down)' }}>
            ✗ {failed.label} failed
          </div>
          {failed.error && (
            <pre
              class="mono"
              style={{
                margin: '6px 0 0',
                padding: 'var(--space-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 11.5,
                color: 'var(--fg-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 160,
                overflow: 'auto',
              }}
            >
              {failed.error}
            </pre>
          )}
          <LikelyFixCta failedStep={failed} />
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StepPills — animated row of step status pills
// ---------------------------------------------------------------------------

function StepPills(props: { steps: DeployStepState[] }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {props.steps.map((s) => {
        const colorMap = {
          running: { dot: 'dot ring pulse', color: 'var(--accent-dark)' },
          success: { dot: 'dot', color: 'var(--status-ok)' },
          failed: { dot: 'dot down', color: 'var(--status-down)' },
          'dry-run': { dot: 'dot unknown', color: 'var(--fg-tertiary)' },
          pending: { dot: 'dot unknown', color: 'var(--fg-tertiary)' },
        }[s.status];
        return (
          <span
            key={s.stepId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--bg-subtle)',
              border:
                '1px solid ' +
                (s.status === 'running' ? 'var(--accent-dark)' : 'var(--border)'),
              borderRadius: 999,
              color: colorMap.color,
              whiteSpace: 'nowrap',
            }}
            title={s.detail ?? s.error}
          >
            <span class={colorMap.dot} aria-hidden="true" />
            <span>{s.label}</span>
            {s.durationMs !== undefined && (
              <span style={{ color: 'var(--fg-tertiary)' }}>
                · {(s.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RunFeed — reverse-chronological list of runs
// ---------------------------------------------------------------------------

interface FeedRow {
  summary: RunSummary;
  /** Lazily fetched on expand. */
  entries?: ActivityLogEntry[];
  loading?: boolean;
  error?: string;
}

function RunFeed(props: { currentRunId: string | null }): JSX.Element {
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const detailsCache = useRef<Map<string, ActivityLogEntry[]>>(new Map());

  // Fetch runs on mount + on every run:start.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await apiFetch<{ runs: RunSummary[] }>('/api/deploy/runs', {
          query: { limit: 20 },
        });
        if (cancelled) return;
        setRows((data.runs ?? []).map((s) => ({ summary: s })));
      } catch {
        if (!cancelled) setRows([]);
      }
    }
    void load();

    const dispose = effect(() => {
      const run = deployState$.value.currentRun;
      if (run && !run.frozen) void load();
    });
    return () => { cancelled = true; dispose(); };
  }, []);

  const toggle = useCallback(async (runId: string) => {
    if (expanded === runId) { setExpanded(null); return; }
    setExpanded(runId);
    if (detailsCache.current.has(runId)) return;
    setRows((curr) => curr ? curr.map((r) => r.summary.runId === runId ? { ...r, loading: true } : r) : curr);
    try {
      const d = await apiFetch<{ run: RunSummary; entries: ActivityLogEntry[] }>(
        `/api/deploy/runs/${runId}`,
      );
      detailsCache.current.set(runId, d.entries);
      setRows((curr) => curr ? curr.map((r) => r.summary.runId === runId ? { ...r, entries: d.entries, loading: false } : r) : curr);
    } catch (err) {
      setRows((curr) => curr ? curr.map((r) => r.summary.runId === runId ? { ...r, loading: false, error: String(err) } : r) : curr);
    }
  }, [expanded]);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 'var(--space-md)' }}>
        <h2 class="section__title" style={{ margin: 0 }}>Recent runs</h2>
        <Annotation size="sm">↓ click failed runs for fix suggestions</Annotation>
      </div>
      {rows === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
              <Skeleton width="60px" height="1.2em" />
              <Skeleton width="40%" height="1.2em" />
              <Skeleton width="80px" height="1.2em" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--fg-tertiary)' }}>
          No runs yet — trigger a deploy.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r) => (
            <FeedRow
              key={r.summary.runId}
              row={r}
              expanded={expanded === r.summary.runId}
              isCurrent={r.summary.runId === props.currentRunId}
              onToggle={() => void toggle(r.summary.runId)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function FeedRow(props: {
  row: FeedRow;
  expanded: boolean;
  isCurrent: boolean;
  onToggle: () => void;
}): JSX.Element {
  const { row, expanded, isCurrent, onToggle } = props;
  const s = row.summary;
  const pill = runStatusToPill(s.status);
  const facets = row.entries ? facetsFromEntries(row.entries) : [];
  const leftBarClass =
    s.status === 'failed' ? 'left-bar-down' :
    s.status === 'partial' ? 'left-bar-warn' :
    s.status === 'in-progress' ? 'left-bar-run' :
    s.status === 'success' ? 'left-bar-ok' : '';

  return (
    <div
      class={leftBarClass}
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-faint)',
        background: isCurrent ? 'var(--bg-subtle)' : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${shortRun(s.runId)} details`}
        style={{
          all: 'unset',
          width: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span class="mono" style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>
          {shortRun(s.runId)}
        </span>
        <RunPill status={pill} sm />
        <span style={{ fontSize: 13 }}>{s.trigger}</span>
        <span style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>
          · {s.stepCount} step{s.stepCount === 1 ? '' : 's'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-tertiary)', fontSize: 12 }}>
          {formatRelative(s.startedAt)}
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {row.loading && <Skeleton width="100%" height="2em" />}
          {row.error && (
            <p style={{ margin: 0, color: 'var(--status-down)', fontSize: 13 }}>
              Failed to load run: {row.error}
            </p>
          )}
          {row.entries && (
            <RunDetail entries={row.entries} status={s.status} />
          )}
        </div>
      )}

      {/* Always-visible facet strip when expanded — even before details load. */}
      {expanded && facets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-sm)' }}>
          {facets.map((f) => (
            <FacetChip key={f.provider} {...f} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunDetail(props: { entries: ActivityLogEntry[]; status: RunSummary['status'] }): JSX.Element {
  const { entries, status } = props;
  const stepEntries = entries.filter((e) => e.kind !== 'start' && e.kind !== 'end');
  const failure = firstFailure(entries);
  const isProblem = status === 'failed' || status === 'partial';

  return (
    <div>
      <ul class="section__list" style={{ margin: 0 }}>
        {stepEntries.map((e, i) => {
          const colorMap = {
            success: 'var(--status-ok)',
            failed: 'var(--status-down)',
            skipped: 'var(--fg-tertiary)',
            'dry-run': 'var(--fg-tertiary)',
          }[e.status];
          return (
            <li key={i} class="section__list-row">
              <span class="section__list-label">
                <span
                  class={`dot ${e.status === 'failed' ? 'down' : e.status === 'skipped' ? 'unknown' : ''}`}
                  aria-hidden="true"
                />
                <span style={{ color: colorMap, fontWeight: 500 }}>{e.action}</span>
                <span style={{ color: 'var(--fg-tertiary)' }}>· {e.provider}</span>
                {e.error && (
                  <span style={{ color: 'var(--status-down)', fontSize: 11.5 }}>
                    {e.error}
                  </span>
                )}
              </span>
              <span class="section__list-meta">
                {e.durationMs !== undefined ? `${(e.durationMs / 1000).toFixed(1)}s` : ''}
              </span>
            </li>
          );
        })}
      </ul>

      {isProblem && failure && (
        <div
          class="left-bar-down"
          style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--status-down-bg)',
            borderRadius: 6,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--status-down)' }}>
            ✗ {failure.action} failed
          </div>
          {failure.error && (
            <pre
              class="mono"
              style={{
                margin: '6px 0 0',
                padding: 'var(--space-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 11.5,
                color: 'var(--fg-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {failure.error}
            </pre>
          )}
          <LikelyFixCta failedActivity={failure} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LikelyFixCta — first-cut: hardcoded "Sync from vault" action
// ---------------------------------------------------------------------------

function LikelyFixCta(_props: { failedStep?: DeployStepState; failedActivity?: ActivityLogEntry }): JSX.Element {
  const [done, setDone] = useState<'ok' | 'err' | null>(null);

  const handleSync = useCallback(async () => {
    setDone(null);
    try {
      await apiFetch('/api/secrets', { method: 'POST' });
      setDone('ok');
    } catch {
      setDone('err');
    }
  }, []);

  return (
    <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Annotation size="md">✦ likely fix</Annotation>
      <Button variant="primary" ariaLabel="Sync secrets from vault" onClick={handleSync}>
        Sync from vault →
      </Button>
      {done === 'ok' && (
        <span style={{ color: 'var(--status-ok)', fontSize: 12 }}>synced — retry the deploy</span>
      )}
      {done === 'err' && (
        <span style={{ color: 'var(--status-down)', fontSize: 12 }}>sync failed</span>
      )}
    </div>
  );
}
