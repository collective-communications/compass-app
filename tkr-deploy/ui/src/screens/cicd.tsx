/**
 * CicdScreen — GitHub Actions / Workflows screen with a recent-runs sparkline.
 *
 * Above the GitHub plugin's `DetailSection[]` (workflows list, recent runs,
 * secrets coverage), renders a sparkline of the last-20 overall deploy runs
 * coloured by status. A per-workflow sparkline would require extending the
 * GitHub plugin to expose run history per workflow id — deferred to polish.
 *
 * @module screens/cicd
 */

import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import { apiFetch } from '../api.js';
import { deployState$ } from '../stores/deploy.js';
import { Card } from '../components/Card.js';
import { Sparkline, type SparkRunStatus } from '../components/Sparkline.js';
import { Annotation } from '../components/Annotation.js';
import { ProviderScreen } from './_ProviderScreen.js';
import type { RunSummary } from '../types.js';

function statusToSpark(status: RunSummary['status']): SparkRunStatus {
  switch (status) {
    case 'success': return 'ok';
    case 'partial': return 'warn';
    case 'failed': return 'down';
    case 'in-progress':
    case 'dry-run': return 'unknown';
  }
}

function shortRun(runId: string): string {
  return `#${runId.length >= 4 ? runId.slice(-4) : runId}`;
}

function RecentRunsSparkline(): JSX.Element {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await apiFetch<{ runs: RunSummary[] }>('/api/deploy/runs', {
          query: { limit: 20 },
        });
        if (cancelled) return;
        setRuns(data.runs ?? []);
      } catch {
        if (!cancelled) setRuns([]);
      }
    }
    void load();
    const dispose = effect(() => {
      const r = deployState$.value.currentRun;
      if (r && !r.frozen) void load();
    });
    return () => { cancelled = true; dispose(); };
  }, []);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 class="section__title" style={{ margin: 0 }}>Recent runs</h2>
          <Annotation size="sm">~ last 20 runs · oldest left → newest right</Annotation>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {runs === null ? (
            <span style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>loading…</span>
          ) : runs.length === 0 ? (
            <span style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>no runs yet</span>
          ) : (
            <Sparkline
              height={32}
              runs={[...runs].reverse().map((r) => ({
                status: statusToSpark(r.status),
                title: `${shortRun(r.runId)} · ${r.status}`,
              }))}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

export function CicdScreen(): JSX.Element {
  return (
    <ProviderScreen
      providerId="github"
      title="Workflows"
      anchorVerb="last triggered in"
      extras={<RecentRunsSparkline />}
    />
  );
}
