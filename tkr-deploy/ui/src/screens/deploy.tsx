/**
 * DeployScreen — primary home screen combining status rollup, deploy CTA,
 * live step log, and expandable provider health cards into a single view.
 *
 * Replaces 5 legacy screens (Overview + 4 provider detail tabs). Provider
 * detail sections lazy-load via {@link SectionRenderer} so adding a provider
 * is config-only.
 *
 * @module screens/deploy
 */

import type { JSX } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { deployState$ } from '../stores/deploy.js';
import type { CurrentRun, DeployStepState, DeployStepUiStatus } from '../stores/deploy.js';
import { vault$ } from '../stores/vault.js';
import { apiFetch } from '../api.js';
import type { DotStatus, HealthResponse, ProviderInfo, DetailSection } from '../types.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { CopyButton } from '../components/CopyButton.js';
import { Skeleton } from '../components/Skeleton.js';
import { StatusDot } from '../components/StatusDot.js';
import { SectionRenderer } from '../sections/SectionRenderer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const S = {
  flexRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' },
  flexCol: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  secondary: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' },
  sectionTitle: { fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: '0 0 var(--space-md)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' },
} as const;

function stepStatusToDot(status: DeployStepUiStatus): DotStatus {
  switch (status) {
    case 'running': return 'warning';
    case 'success': return 'healthy';
    case 'failed': return 'error';
    case 'dry-run':
    case 'pending': return 'unknown';
  }
}

function providerSeverity(status: string): 'healthy' | 'warning' | 'error' | undefined {
  if (status === 'healthy') return 'healthy';
  if (status === 'warning') return 'warning';
  if (status === 'down' || status === 'error') return 'error';
  return undefined;
}

function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// DeployScreen
// ---------------------------------------------------------------------------

export function DeployScreen(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sectionsCache = useRef<Map<string, DetailSection[]>>(new Map());
  const [activeSections, setActiveSections] = useState<DetailSection[] | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch<HealthResponse>('/api/health', { signal: ac.signal })
      .then(setHealth)
      .catch(() => { if (!ac.signal.aborted) setHealthError(true); });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch<{ providers: ProviderInfo[] }>('/api/providers', { signal: ac.signal })
      .then((d) => setProviders(d.providers))
      .catch(() => { /* grid stays in skeleton state */ });
    return () => ac.abort();
  }, []);

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

  const handleRetry = useCallback(async (stepId: string) => {
    await apiFetch('/api/deploy/resume', { method: 'POST', query: { from: stepId } });
  }, []);

  const toggleProvider = useCallback(async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setActiveSections(null); return; }
    setExpandedId(id);
    const cached = sectionsCache.current.get(id);
    if (cached) { setActiveSections(cached); return; }
    setSectionsLoading(true);
    setActiveSections(null);
    try {
      const d = await apiFetch<{ sections: DetailSection[] }>(`/api/providers/${id}/sections`);
      sectionsCache.current.set(id, d.sections);
      setActiveSections(d.sections);
    } catch { setActiveSections([]); }
    finally { setSectionsLoading(false); }
  }, [expandedId]);

  return (
    <div class="screen screen--deploy">
      <h1 class="screen-heading">Deploy</h1>

      <StatusRollup health={health} error={healthError} vaultStatus={vaultState.status} />

      <div style={{ display: 'flex', gap: 'var(--space-md)', margin: 'var(--space-lg) 0' }}>
        <Button variant="primary" disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Deploy'}
          onClick={handleDeploy}>Deploy</Button>
        <Button variant="secondary" disabled={vaultLocked || isRunning}
          ariaLabel={vaultLocked ? 'Vault locked — unlock to deploy' : 'Preview deploy (dry run)'}
          onClick={handlePreview}>Preview</Button>
      </div>

      <StepLog currentRun={currentRun} isRunning={isRunning} onRetry={handleRetry} />

      <ProviderGrid providers={providers} expandedId={expandedId}
        activeSections={activeSections} sectionsLoading={sectionsLoading}
        onToggle={toggleProvider} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusRollup
// ---------------------------------------------------------------------------

function StatusRollup(props: {
  health: HealthResponse | null; error: boolean; vaultStatus: DotStatus;
}): JSX.Element {
  const { health, error, vaultStatus } = props;
  if (error) {
    return (
      <Card severity="error">
        <p style={{ margin: 0, color: 'var(--color-status-error)' }}>Failed to load deployment status.</p>
      </Card>
    );
  }
  if (!health) {
    return (
      <Card>
        <Skeleton width="60%" height="1.2em" />
        <div style={{ marginTop: 'var(--space-sm)' }}><Skeleton width="40%" height="1em" /></div>
      </Card>
    );
  }
  return (
    <Card>
      <div style={{ ...S.flexRow, flexWrap: 'wrap' }}>
        <StatusDot status={vaultStatus} label={`Vault ${vault$.value.label}`} />
        {health.lastDeployed && (
          <span style={S.secondary}>Last deployed {formatRelativeTime(health.lastDeployed)}</span>
        )}
      </div>
      {health.deploymentUrl && (
        <div style={{ ...S.flexRow, marginTop: 'var(--space-sm)' }}>
          <code style={S.secondary}>{health.deploymentUrl}</code>
          <CopyButton getText={() => health.deploymentUrl} />
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StepLog
// ---------------------------------------------------------------------------

function StepLog(props: {
  currentRun: CurrentRun | null; isRunning: boolean;
  onRetry: (stepId: string) => Promise<void>;
}): JSX.Element {
  const { currentRun, isRunning, onRetry } = props;
  if (!currentRun) {
    return (
      <Card>
        <p style={{ margin: 0, ...S.muted }}>No deploy activity. Click Deploy to start.</p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 style={S.sectionTitle}>
        {currentRun.trigger === 'dry-run' ? 'Preview run' : 'Deploy run'}
      </h2>
      <div style={S.flexCol}>
        {currentRun.steps.map((step) => (
          <StepRow key={step.stepId} step={step} onRetry={onRetry} />
        ))}
      </div>
      {isRunning && (
        <div style={{ ...S.flexRow, marginTop: 'var(--space-md)', color: 'var(--color-status-warning)', fontSize: 'var(--font-size-sm)' }}>
          <span class="btn__spinner" style={{ position: 'static', width: '12px', height: '12px' }} aria-hidden="true" />
          <span>Running...</span>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StepRow
// ---------------------------------------------------------------------------

function StepRow(props: {
  step: DeployStepState; onRetry: (stepId: string) => Promise<void>;
}): JSX.Element {
  const { step, onRetry } = props;
  const dur = step.durationMs !== undefined ? `${(step.durationMs / 1000).toFixed(1)}s` : '';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
      <StatusDot status={stepStatusToDot(step.status)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.flexRow, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>{step.label}</span>
          <span style={S.muted}>{step.provider}</span>
          {dur && <span style={S.secondary}>{dur}</span>}
        </div>
        {step.detail && <p style={{ margin: '2px 0 0', ...S.secondary }}>{step.detail}</p>}
        {step.error && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-status-error)' }}>
            {step.error}
          </p>
        )}
        {step.status === 'failed' && (
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <Button variant="secondary" ariaLabel={`Retry from step ${step.label}`}
              onClick={() => onRetry(step.stepId)}>Retry from here</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProviderGrid
// ---------------------------------------------------------------------------

function ProviderGrid(props: {
  providers: ProviderInfo[] | null; expandedId: string | null;
  activeSections: DetailSection[] | null; sectionsLoading: boolean;
  onToggle: (id: string) => Promise<void>;
}): JSX.Element {
  const { providers, expandedId, activeSections, sectionsLoading, onToggle } = props;
  if (!providers) {
    return (
      <div class="provider-grid" style={S.grid}>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <Skeleton width="50%" height="1.2em" />
            <div style={{ marginTop: 'var(--space-sm)' }}><Skeleton width="30%" height="1em" /></div>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 'var(--space-lg)' }}>
      <h2 style={S.sectionTitle}>Providers</h2>
      <div class="provider-grid" style={S.grid}>
        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} expanded={expandedId === p.id}
            sections={expandedId === p.id ? activeSections : null}
            sectionsLoading={expandedId === p.id && sectionsLoading}
            onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProviderCard
// ---------------------------------------------------------------------------

function ProviderCard(props: {
  provider: ProviderInfo; expanded: boolean;
  sections: DetailSection[] | null; sectionsLoading: boolean;
  onToggle: (id: string) => Promise<void>;
}): JSX.Element {
  const { provider, expanded, sections, sectionsLoading, onToggle } = props;
  const sev = providerSeverity(provider.status);
  return (
    <Card severity={sev}>
      <button type="button" aria-expanded={expanded} aria-label={`${provider.name} details`}
        style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', width: '100%' }}
        onClick={() => void onToggle(provider.id)}>
        <StatusDot status={sev ?? 'unknown'} label={provider.name} />
        <span style={{ marginLeft: 'auto', ...S.muted, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">
          ▾
        </span>
      </button>
      {expanded && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {sectionsLoading && <Skeleton width="100%" height="3em" />}
          {sections && sections.length > 0 && <SectionRenderer sections={sections} />}
          {sections && sections.length === 0 && !sectionsLoading && (
            <p style={{ margin: 0, ...S.muted }}>No detail sections available.</p>
          )}
        </div>
      )}
    </Card>
  );
}
