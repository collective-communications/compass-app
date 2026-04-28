/**
 * SecretsScreen — vault status, sync matrix, dry-run preview, per-secret sync.
 *
 * Reads reactive state from `syncState$` and triggers loads via `loadSync()`.
 * Desktop: table. Mobile: card list. Breakpoint at 768px.
 *
 * @module screens/secrets
 */

import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { StatusDot } from '../components/StatusDot.js';
import { Skeleton } from '../components/Skeleton.js';
import { effect } from '@preact/signals';
import { syncState$, loadSync } from '../stores/sync.js';
import type { SyncSecretsResponse } from '../stores/sync.js';
import { deployState$ } from '../stores/deploy.js';
import { apiFetch } from '../api.js';
import { Annotation } from '../components/Annotation.js';
import { FacetChip } from '../components/FacetChip.js';
import type { DotStatus, RunSummary } from '../types.js';

// -- Constants ----------------------------------------------------------------

const VAULT_URL = 'http://localhost:42042';
const SUPABASE_SECRETS_URL = 'https://supabase.com/dashboard/project/gscaczmrruzymzdpzohr/settings/functions';
const TARGET_NAMES = ['Supabase', 'Vercel', 'GitHub'] as const;

type SyncTargetState = 'synced' | 'missing' | 'differs' | 'not_applicable' | 'unverifiable';
type FilterKey = 'all' | 'supabase' | 'vercel' | 'github';
type SecretEntry = SyncSecretsResponse['secrets'][number];

const FILTERS: Array<{ label: string; value: FilterKey }> = [
  { label: 'All', value: 'all' },
  { label: 'Supabase', value: 'supabase' },
  { label: 'Vercel', value: 'vercel' },
  { label: 'GitHub', value: 'github' },
];

const FILTER_RE: Record<string, RegExp> = {
  supabase: /supabase/i, vercel: /vercel/i, github: /github/i,
};

const ICON: Record<SyncTargetState, string> = {
  synced: '✓', missing: '✗', differs: '~', unverifiable: '*', not_applicable: '—',
};

const DOT: Record<SyncTargetState, DotStatus> = {
  synced: 'healthy', missing: 'warning', differs: 'warning',
  unverifiable: 'unknown', not_applicable: 'unknown',
};

const LEGEND: Array<[string, string]> = [
  ['✓', 'Synced'], ['✗', 'Missing'], ['~', 'Differs'],
  ['*', 'Verify manually'], ['—', 'N/A'],
];

// -- Dry-run types ------------------------------------------------------------

interface DryRunResult {
  name: string;
  results: Array<{ target: string; wouldSync: boolean; state: string }>;
}

interface DryRunReport {
  dryRun: boolean;
  wouldSync: number;
  results: DryRunResult[];
}

// -- Helpers ------------------------------------------------------------------

function targetState(entry: SecretEntry, name: string): SyncTargetState {
  return (entry.targets.find((t) => t.name === name)?.state ?? 'not_applicable') as SyncTargetState;
}

function matchesFilter(entry: SecretEntry, f: FilterKey): boolean {
  if (f === 'all') return true;
  const byTarget = entry.targets.some((t) => t.name.toLowerCase() === f && t.state !== 'not_applicable');
  const byName = FILTER_RE[f]?.test(entry.name) ?? false;
  return byTarget || byName;
}

// -- Scoped styles ------------------------------------------------------------

function Styles(): JSX.Element {
  return (
    <style>{`
.secrets-table{display:none}.secrets-mobile{display:block}
@media(min-width:768px){.secrets-table{display:block}.secrets-mobile{display:none}}
.secrets-table table{width:100%;border-collapse:collapse}
.secrets-table th,.secrets-table td{text-align:left;padding:var(--space-sm) var(--space-md);font-size:var(--font-size-sm);border-bottom:1px solid var(--color-border)}
.secrets-table th{color:var(--color-text-secondary);font-weight:500}
.secrets-table tr.row--oos{border-left:4px solid var(--color-status-warning)}
.s-layout{display:flex;flex-direction:column;gap:var(--space-lg)}
.s-row{display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap}
.s-actions{display:flex;align-items:center;gap:var(--space-sm);margin-left:auto}
.s-metric{font-size:var(--font-size-sm)}.s-metric strong{margin-right:4px}
.s-legend{display:flex;gap:var(--space-md);font-size:var(--font-size-sm);color:var(--color-text-secondary);align-items:center}
.s-legend i{display:flex;align-items:center;gap:4px}.s-legend b{font-family:monospace;font-weight:600}
.s-filter{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-sm)}
.s-pills{display:flex;gap:var(--space-sm);flex-wrap:wrap}
.secrets-mobile .card+.card{margin-top:var(--space-sm)}
.sm-targets{display:flex;gap:var(--space-md);margin-bottom:var(--space-sm)}
.sm-actions{display:flex;gap:var(--space-sm)}
.s-diff{padding:var(--space-md);background:var(--color-bg);font-size:var(--font-size-sm);font-family:monospace;white-space:pre-wrap;border-bottom:1px solid var(--color-border)}
.s-preview{margin-top:var(--space-sm)}.s-preview__list{margin-top:var(--space-sm);display:flex;flex-direction:column;gap:var(--space-sm)}
.s-preview__row{display:flex;align-items:center;gap:var(--space-sm);font-size:var(--font-size-sm);flex-wrap:wrap}
.s-empty{text-align:center;padding:var(--space-xl)}.s-empty p{color:var(--color-text-muted)}
    `}</style>
  );
}

// -- Sub-components -----------------------------------------------------------

function VaultBanner({ vault }: { vault: SyncSecretsResponse['vault'] | null }): JSX.Element {
  if (!vault) return <Card><Skeleton width="200px" height="20px" ariaLabel="Loading vault status" /></Card>;
  const locked = vault.locked;
  return (
    <Card>
      <div class="s-row">
        <StatusDot status={locked ? 'warning' : 'healthy'} />
        <span style={{ fontWeight: 600 }}>{vault.name}</span>
        <span class={locked ? 'badge--warning' : 'badge--healthy'}
          style={{ fontSize: 'var(--font-size-sm)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>
          {locked ? 'Locked' : 'Unlocked'}
        </span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {vault.secretCount} secret{vault.secretCount === 1 ? '' : 's'}
        </span>
        <a href={VAULT_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 'var(--font-size-sm)', marginLeft: 'auto' }}>Open Vault</a>
      </div>
      {locked && (
        <p style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-status-warning)' }}>
          Vault is locked — unlock to sync secrets
        </p>
      )}
    </Card>
  );
}

function SyncSummary({ secrets, vaultLocked, onSyncAll, onPreview, previewing }: {
  secrets: SecretEntry[] | null; vaultLocked: boolean;
  onSyncAll: () => Promise<void>; onPreview: () => Promise<void>; previewing: boolean;
}): JSX.Element {
  if (!secrets) return <Card><Skeleton width="300px" height="18px" ariaLabel="Loading sync summary" /></Card>;
  const total = secrets.length;
  const oos = secrets.filter((s) => s.outOfSync).length;
  const miss = secrets.filter((s) => s.targets.some((t) => t.state === 'missing')).length;
  const metrics: Array<[string, number]> = [['Total', total], ['Out of Sync', oos], ['Missing', miss], ['Synced', total - oos]];
  const disabled = vaultLocked || oos === 0;
  return (
    <Card>
      <div class="s-row">
        {metrics.map(([l, v]) => <span key={l} class="s-metric"><strong>{v}</strong> {l}</span>)}
        <div class="s-actions">
          <Button variant="secondary" disabled={disabled} onClick={onPreview}>
            {previewing ? 'Close preview' : 'Preview sync'}
          </Button>
          <Button variant="primary" disabled={disabled} onClick={onSyncAll}>Sync All</Button>
        </div>
      </div>
    </Card>
  );
}

function FilterBar({ active, onChange }: { active: FilterKey; onChange: (f: FilterKey) => void }): JSX.Element {
  return (
    <div class="s-filter">
      <div class="s-pills" role="toolbar" aria-label="Filter by target">
        {FILTERS.map(({ label, value }) => (
          <button key={value} type="button" class="shell-pill"
            aria-pressed={active === value}
            aria-current={active === value ? 'page' : undefined}
            onClick={() => onChange(value)}>{label}</button>
        ))}
      </div>
      <div class="s-legend">
        {LEGEND.map(([sym, label]) => <i key={label}><b>{sym}</b> {label}</i>)}
      </div>
    </div>
  );
}

function TargetCell({ state, target }: { state: SyncTargetState; target: string }): JSX.Element {
  if (state === 'unverifiable' && target === 'Supabase') {
    return (
      <td aria-label={`${target}: ${state}`}>
        <a href={SUPABASE_SECRETS_URL} target="_blank" rel="noopener noreferrer"
          title="Verify manually in Supabase dashboard" style={{ textDecoration: 'none', fontWeight: 600 }}>*</a>
      </td>
    );
  }
  const colors: Partial<Record<SyncTargetState, string>> = {
    synced: 'var(--color-status-healthy)', missing: 'var(--color-status-error)', differs: 'var(--color-status-warning)',
  };
  return (
    <td aria-label={`${target}: ${state}`} style={colors[state] ? { color: colors[state] } : undefined}>
      {ICON[state]}
    </td>
  );
}

// -- Desktop table ------------------------------------------------------------

function Table({ secrets, filter, onSync, expandedDiff, onToggleDiff }: {
  secrets: SecretEntry[]; filter: FilterKey;
  onSync: (n: string) => Promise<void>; expandedDiff: string | null; onToggleDiff: (n: string) => void;
}): JSX.Element {
  const rows = secrets.filter((s) => matchesFilter(s, filter));
  if (!rows.length) return <div class="secrets-table"><Card class="s-empty"><p>No secrets match this filter.</p></Card></div>;
  return (
    <div class="secrets-table">
      <table role="table" aria-label="Secrets">
        <thead><tr>
          <th scope="col">Secret Name</th><th scope="col">Vault Value</th>
          {TARGET_NAMES.map((t) => <th key={t} scope="col">{t}</th>)}
          <th scope="col">Action</th>
        </tr></thead>
        <tbody>{rows.map((e) => {
          const hasDiff = e.targets.some((t) => t.state === 'differs');
          const open = expandedDiff === e.name;
          return (<>
            <tr key={e.name} class={e.outOfSync ? 'row--oos' : ''}>
              <td><code>{e.name}</code></td>
              <td style={{ fontFamily: 'monospace' }}>{e.maskedValue}</td>
              {TARGET_NAMES.map((t) => <TargetCell key={t} state={targetState(e, t)} target={t} />)}
              <td>{e.outOfSync ? (
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Button variant="secondary" onClick={() => onSync(e.name)}>Sync</Button>
                  {hasDiff && <Button variant="secondary" onClick={() => onToggleDiff(e.name)}>Diff</Button>}
                </div>
              ) : <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Synced</span>}</td>
            </tr>
            {open && <tr key={`${e.name}-diff`}><td colSpan={6} class="s-diff">
              {e.targets.filter((t) => t.state === 'differs').map((t) => `${t.name}: value differs from vault`).join('\n')}
            </td></tr>}
          </>);
        })}</tbody>
      </table>
    </div>
  );
}

// -- Mobile cards -------------------------------------------------------------

function MobileList({ secrets, filter, onSync }: {
  secrets: SecretEntry[]; filter: FilterKey; onSync: (n: string) => Promise<void>;
}): JSX.Element {
  const rows = secrets.filter((s) => matchesFilter(s, filter));
  if (!rows.length) return <div class="secrets-mobile"><Card class="s-empty"><p>No secrets match this filter.</p></Card></div>;
  return (
    <div class="secrets-mobile">
      {rows.map((e) => (
        <Card key={e.name} severity={e.outOfSync ? 'warning' : undefined}>
          <code style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{e.name}</code>
          <div style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', color: 'var(--color-text-secondary)', margin: '4px 0 var(--space-sm)' }}>
            {e.maskedValue}
          </div>
          <div class="sm-targets">
            {TARGET_NAMES.map((t) => {
              const s = targetState(e, t);
              return <StatusDot key={t} status={DOT[s]} label={`${t} ${ICON[s]}`} />;
            })}
          </div>
          {e.outOfSync && (
            <div class="sm-actions">
              <Button variant="secondary" onClick={() => onSync(e.name)}>Sync</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// -- Dry-run preview ----------------------------------------------------------

function Preview({ report, onConfirm }: { report: DryRunReport; onConfirm: () => Promise<void> }): JSX.Element {
  const has = report.wouldSync > 0;
  return (
    <Card severity={has ? 'warning' : 'healthy'} class="s-preview">
      <div class="s-row" style={{ marginBottom: 'var(--space-sm)' }}>
        <strong style={{ fontSize: 'var(--font-size-sm)' }}>
          Dry-run preview: {report.wouldSync} secret{report.wouldSync === 1 ? '' : 's'} would be synced
        </strong>
        {has && <Button variant="primary" onClick={onConfirm}>Confirm sync</Button>}
      </div>
      <div class="s-preview__list">
        {report.results.map((item) => (
          <div key={item.name} class="s-preview__row">
            <code>{item.name}</code>
            {item.results.map((r) => (
              <StatusDot key={r.target} status={r.wouldSync ? 'warning' : 'healthy'}
                label={`${r.target}: ${r.wouldSync ? 'would sync' : r.state}`} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

// -- Locked empty state -------------------------------------------------------

function LockedState(): JSX.Element {
  return (
    <Card class="s-empty">
      <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }} aria-hidden="true">{'🔒'}</div>
      <p style={{ color: 'var(--color-text-secondary)' }}>Vault is locked. Unlock to view and manage secrets.</p>
      <a href={VAULT_URL} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 'var(--space-md)' }}>Open Vault</a>
    </Card>
  );
}

// -- Run anchor + facet strip (Direction D) ----------------------------------

function shortRun(runId: string): string {
  return `#${runId.length >= 4 ? runId.slice(-4) : runId}`;
}

/** "~ last sync run #X" annotation. Shows the most recent overall run. */
function RunAnchor(_props: { secrets: SecretEntry[] | null }): JSX.Element | null {
  const [run, setRun] = useState<RunSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await apiFetch<{ runs: RunSummary[] }>('/api/deploy/runs', { query: { limit: 1 } });
        if (!cancelled) setRun(data.runs?.[0] ?? null);
      } catch { if (!cancelled) setRun(null); }
    }
    void load();
    const dispose = effect(() => {
      const r = deployState$.value.currentRun;
      if (r && !r.frozen) void load();
    });
    return () => { cancelled = true; dispose(); };
  }, []);
  if (!run) return null;
  return (
    <Annotation size="md">
      ~ last sync in run{' '}
      <a
        href="/"
        style={{ color: 'inherit', textDecoration: 'underline' }}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      >
        {shortRun(run.runId)}
      </a>
    </Annotation>
  );
}

/** FacetChip strip across the per-target sync state for Vault → Supabase → Vercel → GitHub. */
function SecretsFacetStrip({ secrets }: { secrets: SecretEntry[] | null }): JSX.Element | null {
  if (!secrets) return null;

  // Aggregate per-target state across all secrets: any "missing" → down,
  // any "differs" → running (≈ pending), else ok.
  const buckets: Record<'Supabase' | 'Vercel' | 'GitHub', { ok: number; warn: number; down: number }> = {
    Supabase: { ok: 0, warn: 0, down: 0 },
    Vercel: { ok: 0, warn: 0, down: 0 },
    GitHub: { ok: 0, warn: 0, down: 0 },
  };
  for (const s of secrets) {
    for (const t of s.targets) {
      const name = t.name as 'Supabase' | 'Vercel' | 'GitHub';
      if (!(name in buckets)) continue;
      if (t.state === 'synced') buckets[name].ok += 1;
      else if (t.state === 'differs' || t.state === 'unverifiable') buckets[name].warn += 1;
      else if (t.state === 'missing') buckets[name].down += 1;
    }
  }

  const chips: Array<{ provider: 'Vault' | 'Supabase' | 'Vercel' | 'GitHub'; status: 'ok' | 'down' | 'running'; change: string }> = [
    { provider: 'Vault', status: 'ok', change: `${secrets.length} secret${secrets.length === 1 ? '' : 's'}` },
  ];
  (['Supabase', 'Vercel', 'GitHub'] as const).forEach((name) => {
    const b = buckets[name];
    const total = b.ok + b.warn + b.down;
    if (total === 0) return;
    const status = b.down > 0 ? 'down' : b.warn > 0 ? 'running' : 'ok';
    const change =
      status === 'down' ? `${b.down} missing` :
      status === 'running' ? `${b.warn} differs` :
      `${b.ok} synced`;
    chips.push({ provider: name, status, change });
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 var(--space-md)' }}>
      {chips.map((c) => (
        <FacetChip key={c.provider} provider={c.provider} status={c.status} change={c.change} />
      ))}
    </div>
  );
}

// -- Main screen --------------------------------------------------------------

export function SecretsScreen(): JSX.Element {
  const [data, setData] = useState<SyncSecretsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunReport | null>(null);

  useSignalEffect(() => {
    const s = syncState$.value;
    setData(s.data);
    setLoading(s.loading);
    setError(s.error);
  });

  useEffect(() => { void loadSync(); }, []);

  const reload = useCallback(async () => { await loadSync(); setDryRun(null); }, []);

  const syncSecret = useCallback(async (name: string) => {
    await apiFetch(`/api/secrets/${encodeURIComponent(name)}/sync`, { method: 'POST' });
    await reload();
  }, [reload]);

  const syncAll = useCallback(async () => {
    await apiFetch('/api/secrets/sync', { method: 'POST' });
    await reload();
  }, [reload]);

  const handlePreview = useCallback(async () => {
    if (dryRun) { setDryRun(null); return; }
    const r = await apiFetch<DryRunReport>('/api/secrets/sync', { method: 'POST', query: { dryRun: '1' } });
    setDryRun(r);
  }, [dryRun]);

  const toggleDiff = useCallback((n: string) => setExpandedDiff((p) => (p === n ? null : n)), []);

  const secrets = data?.secrets ?? null;
  const vault = data?.vault ?? null;
  const locked = vault?.locked ?? false;

  return (
    <div class="screen screen--secrets">
      <Styles />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 class="screen-heading" style={{ margin: 0 }}>Secrets</h1>
        <RunAnchor secrets={secrets} />
      </div>
      <SecretsFacetStrip secrets={secrets} />
      {error && <Card severity="error"><p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>{error}</p></Card>}
      <div class="s-layout">
        <VaultBanner vault={vault} />
        {locked && !loading ? <LockedState /> : (<>
          <SyncSummary secrets={secrets} vaultLocked={locked} onSyncAll={syncAll}
            onPreview={handlePreview} previewing={dryRun !== null} />
          {dryRun && <Preview report={dryRun} onConfirm={syncAll} />}
          {secrets && (<>
            <FilterBar active={filter} onChange={setFilter} />
            <Table secrets={secrets} filter={filter} onSync={syncSecret}
              expandedDiff={expandedDiff} onToggleDiff={toggleDiff} />
            <MobileList secrets={secrets} filter={filter} onSync={syncSecret} />
          </>)}
        </>)}
      </div>
    </div>
  );
}
