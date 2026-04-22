/**
 * Frontend-facing types for the rebuilt UI.
 *
 * These mirror (and in some cases re-export) the authoritative types from
 * `src/types/*` so UI modules can import from one place without reaching into
 * the core. Keep this file structural-only — no runtime code.
 *
 * @module types
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Status dot colour — matches `src/types/plugin.ts` DotStatus. */
export type DotStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/** Provider health rollup — matches `src/types/provider.ts` ProviderStatus. */
export type ProviderStatus = 'healthy' | 'warning' | 'down' | 'unknown';

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/** One entry under `/api/manifest.screens`. */
export interface ManifestScreen {
  label: string;
  path: string;
  modulePath: string;
  providerId?: string;
}

/** Response from `GET /api/manifest`. */
export interface ManifestResponse {
  name: string;
  screens: ManifestScreen[];
}

// ---------------------------------------------------------------------------
// Health + providers
// ---------------------------------------------------------------------------

/** Response from `GET /api/health`. */
export interface HealthResponse {
  vaultLocked: boolean;
  deploymentUrl: string;
  lastDeployed: string | null;
  rollup: string;
  checkedAt?: number;
  providers?: Array<{
    provider: string;
    status: ProviderStatus;
    label: string;
    latencyMs?: number;
    error?: string;
  }>;
}

/** One entry under `/api/providers.providers`. */
export interface ProviderInfo {
  id: string;
  name: string;
  status: ProviderStatus;
  metrics: Record<string, string>;
  route: string;
}

// ---------------------------------------------------------------------------
// Detail sections — mirror of `src/types/plugin.ts` DetailSection union.
// ---------------------------------------------------------------------------

export type DetailSection =
  | {
      kind: 'kv';
      title: string;
      items: { label: string; value: string | null }[];
    }
  | {
      kind: 'metric-grid';
      title: string;
      metrics: { label: string; value: string; status?: DotStatus }[];
    }
  | {
      kind: 'list';
      title: string;
      items: { label: string; meta?: string; status?: DotStatus }[];
    }
  | {
      kind: 'progress';
      title: string;
      current: number;
      total: number;
      meta?: string;
    }
  | {
      kind: 'table';
      title: string;
      columns: string[];
      rows: string[][];
    }
  | {
      kind: 'custom-module';
      title: string;
      modulePath: string;
    };

/** Kinds used by the SectionRenderer switch. */
export type DetailSectionKind = DetailSection['kind'];

// ---------------------------------------------------------------------------
// Activity log / runs
// ---------------------------------------------------------------------------

/** Matches `RunSummary` from `src/core/deploy-orchestrator.ts`. */
export interface RunSummary {
  runId: string;
  trigger: 'full' | 'step' | 'resume' | 'dry-run';
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'partial' | 'failed' | 'dry-run' | 'in-progress';
  stepCount: number;
}

/** Matches `ActivityLogEntry` from `src/types/activity.ts`. */
export interface ActivityLogEntry {
  timestamp: string;
  action: string;
  provider: string;
  status: 'success' | 'skipped' | 'failed' | 'dry-run';
  durationMs?: number;
  error?: string;
  runId?: string;
  trigger?: 'full' | 'step' | 'resume' | 'dry-run';
  kind?: 'start' | 'step' | 'end';
  stepId?: string;
}

// ---------------------------------------------------------------------------
// Event bus frames — mirror `src/core/event-bus.ts`.
// ---------------------------------------------------------------------------

export type DeployTrigger = 'full' | 'step' | 'resume' | 'dry-run';
export type DeployRunStatus = 'success' | 'failed' | 'partial';

export type DeployEvent =
  | {
      kind: 'run:start';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
    }
  | {
      kind: 'run:complete';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
      status: DeployRunStatus;
    }
  | {
      kind: 'run:dry-run';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
      status?: DeployRunStatus;
    }
  | {
      kind: 'step:start';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
    }
  | {
      kind: 'step:complete';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
      durationMs: number;
      detail?: string;
    }
  | {
      kind: 'step:fail';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
      durationMs: number;
      error: string;
    };

/** Union of all SSE `event:` names the server emits (plus keepalive / connected). */
export type DeployEventKind = DeployEvent['kind'];
export type SseEventKind = DeployEventKind | 'keepalive' | 'connected';
