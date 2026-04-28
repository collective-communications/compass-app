/**
 * ProviderScreen — shared scaffold for Direction D's run-anchored provider
 * screens (database, frontend, email, secrets, cicd).
 *
 * Renders:
 *   1. Heading + "last run #X" trace anchor (clicking returns to overview).
 *   2. Loading skeleton while sections fetch.
 *   3. The provider's `DetailSection[]` via {@link SectionRenderer}.
 *   4. Optional `extras` slot for screen-specific content (e.g. CI/CD sparklines,
 *      secrets sync matrix) rendered above the sections.
 *
 * Data source: `GET /api/providers/:id/sections`. Run anchor is derived from
 * `GET /api/deploy/runs?limit=1` — the most recent run that this provider
 * participated in. (First cut: just the most recent overall run.)
 *
 * @module screens/_ProviderScreen
 */

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import { apiFetch } from '../api.js';
import { deployState$ } from '../stores/deploy.js';
import { Card } from '../components/Card.js';
import { Skeleton } from '../components/Skeleton.js';
import { Annotation } from '../components/Annotation.js';
import { SectionRenderer } from '../sections/SectionRenderer.js';
import type { DetailSection, RunSummary } from '../types.js';

export interface ProviderScreenProps {
  /** Plugin id used by `/api/providers/:id/sections`. */
  providerId: string;
  /** Heading shown at the top. */
  title: string;
  /** Verb used in the run anchor — e.g. "applied in", "deployed in", "synced in". */
  anchorVerb: string;
  /** Optional content rendered above the sections (sparklines, sync matrix, etc.). */
  extras?: ComponentChildren;
}

function shortRun(runId: string): string {
  return `#${runId.length >= 4 ? runId.slice(-4) : runId}`;
}

export function ProviderScreen(props: ProviderScreenProps): JSX.Element {
  const { providerId, title, anchorVerb, extras } = props;
  const [sections, setSections] = useState<DetailSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);

  // Sections (provider details).
  useEffect(() => {
    const ac = new AbortController();
    apiFetch<{ sections: DetailSection[] }>(`/api/providers/${providerId}/sections`, {
      signal: ac.signal,
    })
      .then((d) => setSections(d.sections ?? []))
      .catch((e) => { if (!ac.signal.aborted) { setError(String(e)); setSections([]); } });
    return () => ac.abort();
  }, [providerId]);

  // Last run anchor — refreshes when a new run starts.
  useEffect(() => {
    let cancelled = false;
    async function loadLastRun(): Promise<void> {
      try {
        const data = await apiFetch<{ runs: RunSummary[] }>('/api/deploy/runs', {
          query: { limit: 1 },
        });
        if (cancelled) return;
        setLastRun(data.runs?.[0] ?? null);
      } catch {
        if (!cancelled) setLastRun(null);
      }
    }
    void loadLastRun();
    const dispose = effect(() => {
      const r = deployState$.value.currentRun;
      if (r && !r.frozen) void loadLastRun();
    });
    return () => { cancelled = true; dispose(); };
  }, [providerId]);

  return (
    <div class="screen">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 class="screen-heading" style={{ margin: 0 }}>{title}</h1>
        {lastRun ? (
          <Annotation size="md">
            ~ {anchorVerb} run{' '}
            <a
              href="/"
              style={{ color: 'inherit', textDecoration: 'underline' }}
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                window.history.pushState(null, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              {shortRun(lastRun.runId)}
            </a>
          </Annotation>
        ) : null}
      </div>

      {extras !== undefined && <div>{extras}</div>}

      {sections === null ? (
        <Card>
          <Skeleton width="60%" height="1.2em" />
          <div style={{ marginTop: 8 }}><Skeleton width="40%" height="1em" /></div>
          <div style={{ marginTop: 8 }}><Skeleton width="80%" height="1em" /></div>
        </Card>
      ) : sections.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: 'var(--fg-tertiary)' }}>
            {error ?? 'No detail sections available.'}
          </p>
        </Card>
      ) : (
        <Card>
          <SectionRenderer sections={sections} />
        </Card>
      )}
    </div>
  );
}
