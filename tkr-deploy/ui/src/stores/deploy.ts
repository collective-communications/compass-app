/**
 * Deploy store — single source of truth for the currently-running (or most
 * recently completed) deploy run.
 *
 * Subscribes to `/api/events` via {@link createEventSource} at app boot and
 * accumulates step state as events arrive. The `currentRun` stays on screen
 * after `run:complete` / `run:dry-run` until the next `run:start` replaces
 * it, so the History-on-Deploy rollup keeps the last result visible.
 *
 * @module stores/deploy
 */

import { signal, type Signal } from '@preact/signals';
import { createEventSource } from '../api.js';
import type { DeployEvent, DeployTrigger } from '../types.js';

/** Per-step status in the live log pane. */
export type DeployStepUiStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'dry-run';

/** One row in the live step log. */
export interface DeployStepState {
  stepId: string;
  label: string;
  provider: string;
  status: DeployStepUiStatus;
  startedAt?: string;
  durationMs?: number;
  detail?: string;
  error?: string;
}

/** Snapshot of the current run as seen by the UI. */
export interface CurrentRun {
  runId: string;
  trigger: DeployTrigger;
  startedAt: string;
  finishedAt?: string;
  frozen: boolean;
  steps: DeployStepState[];
}

export interface DeployState {
  currentRun: CurrentRun | null;
  /** Connection state of the SSE stream — reserved for future UI. */
  streamConnected: boolean;
}

export const deployState$: Signal<DeployState> = signal<DeployState>({
  currentRun: null,
  streamConnected: false,
});

let source: EventSource | null = null;

function findOrAppendStep(steps: DeployStepState[], stepId: string): number {
  const idx = steps.findIndex((s) => s.stepId === stepId);
  return idx;
}

function upsertStep(run: CurrentRun, next: DeployStepState): CurrentRun {
  const steps = [...run.steps];
  const idx = findOrAppendStep(steps, next.stepId);
  if (idx === -1) {
    steps.push(next);
  } else {
    steps[idx] = { ...steps[idx], ...next };
  }
  return { ...run, steps };
}

function handle(event: DeployEvent): void {
  const prev = deployState$.value;

  switch (event.kind) {
    case 'run:start': {
      const nextRun: CurrentRun = {
        runId: event.runId,
        trigger: event.trigger,
        startedAt: event.timestamp,
        frozen: false,
        steps: [],
      };
      deployState$.value = { ...prev, currentRun: nextRun };
      return;
    }

    case 'step:start': {
      if (!prev.currentRun || prev.currentRun.runId !== event.runId) return;
      const run = upsertStep(prev.currentRun, {
        stepId: event.stepId,
        label: event.label,
        provider: event.provider,
        status: 'running',
        startedAt: event.timestamp,
      });
      deployState$.value = { ...prev, currentRun: run };
      return;
    }

    case 'step:complete': {
      if (!prev.currentRun || prev.currentRun.runId !== event.runId) return;
      const isDryRun = prev.currentRun.trigger === 'dry-run';
      const run = upsertStep(prev.currentRun, {
        stepId: event.stepId,
        label: event.label,
        provider: event.provider,
        status: isDryRun ? 'dry-run' : 'success',
        durationMs: event.durationMs,
        detail: event.detail,
      });
      deployState$.value = { ...prev, currentRun: run };
      return;
    }

    case 'step:fail': {
      if (!prev.currentRun || prev.currentRun.runId !== event.runId) return;
      const run = upsertStep(prev.currentRun, {
        stepId: event.stepId,
        label: event.label,
        provider: event.provider,
        status: 'failed',
        durationMs: event.durationMs,
        error: event.error,
      });
      deployState$.value = { ...prev, currentRun: run };
      return;
    }

    case 'run:complete':
    case 'run:dry-run': {
      if (!prev.currentRun || prev.currentRun.runId !== event.runId) return;
      const run: CurrentRun = {
        ...prev.currentRun,
        finishedAt: event.timestamp,
        frozen: true,
      };
      deployState$.value = { ...prev, currentRun: run };
      return;
    }
  }
}

/**
 * Open the SSE stream and start routing events into {@link deployState$}.
 * Idempotent — second calls reuse the existing connection.
 */
export function startDeployStream(): void {
  if (source !== null) return;

  source = createEventSource('/api/events', {
    connected: () => {
      deployState$.value = { ...deployState$.value, streamConnected: true };
    },
    keepalive: () => {
      // No-op; keeps the connection open through intermediaries.
    },
    'run:start': (data: unknown) => handle(data as DeployEvent),
    'step:start': (data: unknown) => handle(data as DeployEvent),
    'step:complete': (data: unknown) => handle(data as DeployEvent),
    'step:fail': (data: unknown) => handle(data as DeployEvent),
    'run:complete': (data: unknown) => handle(data as DeployEvent),
    'run:dry-run': (data: unknown) => handle(data as DeployEvent),
  });

  source.addEventListener('error', () => {
    deployState$.value = { ...deployState$.value, streamConnected: false };
  });
}

/** Tear down the SSE connection. Useful for tests and hot-reload. */
export function stopDeployStream(): void {
  if (source !== null) {
    source.close();
    source = null;
  }
  deployState$.value = { ...deployState$.value, streamConnected: false };
}
