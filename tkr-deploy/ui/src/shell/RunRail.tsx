/**
 * RunRail — desktop left sidebar (220px) with run-centric nav + last-5 runs.
 *
 * Direction D's defining shell element: section nav at the top (Runs, Secrets,
 * Database, Frontend, Email, Workflows), followed by the most recent 5 runs
 * with relative timestamps. Hidden < 768px (the {@link MobileTabBar} takes
 * over on phones).
 *
 * Reads `currentPath$` for the active item; fetches last-5 from
 * `/api/deploy/runs?limit=5` on mount and refreshes whenever a `run:start`
 * SSE event lands (via subscribing to `deployState$`).
 *
 * @module shell/RunRail
 */

import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import { currentPath$, navigate } from '../router.js';
import { apiFetch } from '../api.js';
import { deployState$ } from '../stores/deploy.js';
import { Annotation } from '../components/Annotation.js';
import type { RunSummary } from '../types.js';

export interface RailNavItem {
  id: string;
  label: string;
  /** Single-character glyph (Plex Mono). */
  icon: string;
  path: string;
  /** Optional active-only annotation (e.g. "↓ live feed"). */
  annotation?: string;
  /** Optional warn count to show on the right. */
  warn?: number;
}

export const RAIL_NAV: readonly RailNavItem[] = [
  { id: 'overview', label: 'Runs', icon: '▶', path: '/', annotation: '↓ live feed' },
  { id: 'secrets', label: 'Secrets', icon: '◇', path: '/secrets' },
  { id: 'database', label: 'Database', icon: '◐', path: '/database' },
  { id: 'frontend', label: 'Frontend', icon: '▲', path: '/frontend' },
  { id: 'email', label: 'Email', icon: '✉', path: '/email' },
  { id: 'cicd', label: 'Workflows', icon: '◆', path: '/cicd' },
] as const;

/** Format a relative time short — "now", "1m", "2h", "3d". */
function formatRel(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 30) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/** Short numeric run handle — e.g. last 4 chars of UUID. */
function shortRunId(runId: string): string {
  const tail = runId.length >= 4 ? runId.slice(-4) : runId;
  return `#${tail}`;
}

interface RailRunRow {
  runId: string;
  short: string;
  status: RunSummary['status'];
  rel: string;
  /** Best-effort label: trigger + step count. */
  label: string;
}

function summarize(run: RunSummary): RailRunRow {
  return {
    runId: run.runId,
    short: shortRunId(run.runId),
    status: run.status,
    rel: formatRel(run.startedAt),
    label: `${run.trigger} · ${run.stepCount} steps`,
  };
}

export function RunRail(): JSX.Element {
  const active = currentPath$.value;
  const [runs, setRuns] = useState<RailRunRow[]>([]);

  // Initial fetch + refresh on every run:start.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await apiFetch<{ runs: RunSummary[] }>('/api/deploy/runs', {
          query: { limit: 5 },
        });
        if (cancelled) return;
        setRuns((data.runs ?? []).map(summarize));
      } catch {
        // Silent — rail stays empty.
      }
    }
    void load();

    // Refresh whenever a new run starts. effect() returns a dispose function.
    const dispose = effect(() => {
      const run = deployState$.value.currentRun;
      if (run && !run.frozen) void load();
    });

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return (
    <aside class="run-rail" aria-label="Run navigation">
      <div class="run-rail__head">
        <div class="run-rail__head-title">
          tkr-deploy <Annotation size="sm">~ ops</Annotation>
        </div>
      </div>

      <nav class="run-rail__nav" aria-label="Sections">
        {RAIL_NAV.map((item) => {
          const on = item.path === active;
          return (
            <div key={item.id}>
              <button
                type="button"
                class="run-rail__nav-item"
                aria-current={on ? 'page' : undefined}
                onClick={() => navigate(item.path)}
              >
                <span>
                  <span class="run-rail__nav-glyph" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {item.warn !== undefined && (
                  <span class="run-rail__nav-warn">{item.warn}</span>
                )}
              </button>
              {on && item.annotation && (
                <div style={{ padding: '0 14px', marginTop: -2 }}>
                  <Annotation size="sm">{item.annotation}</Annotation>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div class="run-rail__section-label">last 5 runs</div>
      <div class="run-rail__runs">
        {runs.length === 0 ? (
          <div class="run-rail__run" style={{ color: 'var(--fg-tertiary)' }}>
            <span class="run-rail__run-num">—</span>
            <span class="run-rail__run-msg">no runs yet</span>
            <span />
          </div>
        ) : (
          runs.map((r, i) => {
            const cls = ['run-rail__run', i === 0 ? 'run-rail__run--active' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={r.runId}
                type="button"
                class={cls}
                onClick={() => navigate('/')}
                title={r.label}
              >
                <span class="run-rail__run-num">{r.short}</span>
                <span class="run-rail__run-msg">{r.label}</span>
                <span class="run-rail__run-time">{r.rel}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
