import type { VaultClient } from '../types/vault.js';
import type { ActivityLogEntry } from '../types/activity.js';
import type { PluginDeployStep } from '../types/plugin.js';
import { join } from 'node:path';
import { EventBus, type DeployEvent, type DeployTrigger } from './event-bus.js';

// --- Types ---

export interface DeployStepState {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  detail: string;
  startedAt: number | null;
  completedAt: number | null;
}

export interface StepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped' | 'dry-run';
  durationMs: number;
  detail?: string;
  error?: string;
}

export interface DeployReport {
  status: 'success' | 'partial' | 'failed';
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: StepResult[];
  failedAtStep?: string;
  runId: string;
  trigger: DeployTrigger;
}

export interface ProgressCallbacks {
  onStepStart?(step: DeployStepState): void;
  onStepComplete?(step: DeployStepState, result: StepResult): void;
  onStepFail?(step: DeployStepState, error: Error): void;
}

export interface DeployOrchestratorConfig {
  vaultClient: VaultClient;
  /** All deploy steps from all providers, pre-sorted by order. */
  steps: PluginDeployStep[];
  /** Override for activity log path (default: tkr-deploy/activity.json). */
  activityLogPath?: string;
  /** Optional event bus for lifecycle publishing. Defaults to a silent no-op bus. */
  eventBus?: EventBus;
}

/** Summary of one run as reconstructed from the JSONL activity log. */
export interface RunSummary {
  runId: string;
  trigger: DeployTrigger;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'partial' | 'failed' | 'dry-run' | 'in-progress';
  stepCount: number;
}

/** Options for {@link DeployOrchestrator.fullDeploy}. */
export interface FullDeployOptions {
  dryRun?: boolean;
  callbacks?: ProgressCallbacks;
}

/** Internal execution context for a single step. */
interface StepContext {
  runId: string;
  trigger: DeployTrigger;
  dryRun?: boolean;
  callbacks?: ProgressCallbacks;
}

// --- Errors ---

export class DeployInProgressError extends Error {
  readonly code = 'DEPLOY_IN_PROGRESS' as const;
  constructor() {
    super('A deployment is already in progress');
    this.name = 'DeployInProgressError';
  }
}

// --- Orchestrator ---

export class DeployOrchestrator {
  private readonly config: DeployOrchestratorConfig;
  private readonly _activityLogPath: string;
  private readonly eventBus?: EventBus;
  private running = false;

  constructor(config: DeployOrchestratorConfig) {
    this.config = config;
    this._activityLogPath =
      config.activityLogPath ??
      join(import.meta.dir, '..', '..', 'activity.json');
    this.eventBus = config.eventBus;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Absolute path of the JSONL activity log this orchestrator reads/writes. */
  get activityLogPath(): string {
    return this._activityLogPath;
  }

  /**
   * Execute all deployment steps in order. Halts on failure.
   *
   * Accepts either a bare {@link ProgressCallbacks} (legacy) or a
   * {@link FullDeployOptions} bag with `dryRun` and `callbacks`.
   */
  async fullDeploy(
    optsOrCallbacks?: FullDeployOptions | ProgressCallbacks,
  ): Promise<DeployReport> {
    const { dryRun, callbacks } = normalizeFullDeployArg(optsOrCallbacks);
    return this.runSteps({
      steps: this.config.steps,
      trigger: dryRun ? 'dry-run' : 'full',
      dryRun,
      callbacks,
    });
  }

  /**
   * Resume a failed run by re-executing from the given step onward. A fresh
   * runId is generated; the trigger is reported as 'resume'.
   */
  async resumeFromStep(
    stepId: string,
    callbacks?: ProgressCallbacks,
  ): Promise<DeployReport> {
    const idx = this.config.steps.findIndex((s) => s.id === stepId);
    if (idx === -1) {
      throw new Error(`Unknown step: ${stepId}`);
    }
    return this.runSteps({
      steps: this.config.steps.slice(idx),
      trigger: 'resume',
      callbacks,
    });
  }

  /** Execute a single step by ID. */
  async stepDeploy(
    stepId: string,
    callbacks?: ProgressCallbacks,
  ): Promise<StepResult> {
    if (this.running) {
      throw new DeployInProgressError();
    }
    const step = this.config.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Unknown step: ${stepId}`);
    }

    const runId = this.generateRunId();
    const trigger: DeployTrigger = 'step';
    const startedAt = Date.now();

    this.publish({
      kind: 'run:start',
      runId,
      timestamp: new Date(startedAt).toISOString(),
      trigger,
    });
    await this.appendActivityLog({
      timestamp: new Date(startedAt).toISOString(),
      action: 'run:start',
      provider: 'core',
      status: 'success',
      runId,
      trigger,
      kind: 'start',
    });

    this.running = true;
    let result: StepResult;
    try {
      result = await this.executeStep(step, { runId, trigger, callbacks });
    } finally {
      this.running = false;
    }

    const completedAt = Date.now();
    const runStatus = result.status === 'success' ? 'success' : 'failed';
    this.publish({
      kind: 'run:complete',
      runId,
      timestamp: new Date(completedAt).toISOString(),
      trigger,
      status: runStatus,
    });
    await this.appendActivityLog({
      timestamp: new Date(completedAt).toISOString(),
      action: 'run:complete',
      provider: 'core',
      status: runStatus === 'success' ? 'success' : 'failed',
      runId,
      trigger,
      kind: 'end',
      durationMs: completedAt - startedAt,
    });

    return result;
  }

  /**
   * Read per-step activity log entries, most recent first.
   *
   * Run-level markers (`kind: 'start' | 'end'`) are filtered out — this method
   * returns only step-level entries for backward compatibility with v1
   * consumers. Use {@link listRuns} / {@link getRun} for run-level views.
   */
  async getActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
    try {
      const entries = await this.readAllEntries();
      const stepEntries = entries.filter(
        (e) => e.kind !== 'start' && e.kind !== 'end',
      );
      return stepEntries.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  /**
   * List runs (groups of activity entries) newest-first.
   *
   * V1 entries (no runId) are clustered by timestamp proximity (<30s) into
   * synthetic runs with id `legacy-<first-timestamp-ms>`.
   */
  async listRuns(limit = 50): Promise<RunSummary[]> {
    const grouped = await this.groupEntriesByRun();
    const summaries = grouped.map((g) => this.summarizeRun(g.runId, g.entries));
    summaries.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    return summaries.slice(0, limit);
  }

  /** Fetch a single run's summary + entries, or null if it doesn't exist. */
  async getRun(
    runId: string,
  ): Promise<{ run: RunSummary; entries: ActivityLogEntry[] } | null> {
    const grouped = await this.groupEntriesByRun();
    const found = grouped.find((g) => g.runId === runId);
    if (!found) return null;
    return {
      run: this.summarizeRun(found.runId, found.entries),
      entries: found.entries,
    };
  }

  // --- Private ---

  /** Run a contiguous slice of steps end-to-end, writing run markers. */
  private async runSteps(args: {
    steps: PluginDeployStep[];
    trigger: DeployTrigger;
    dryRun?: boolean;
    callbacks?: ProgressCallbacks;
  }): Promise<DeployReport> {
    const { steps, trigger, dryRun, callbacks } = args;

    if (this.running) {
      throw new DeployInProgressError();
    }

    const vaultHealth = await this.config.vaultClient.health();
    if (vaultHealth.locked) {
      throw new Error('Vault is locked — unlock before deploying');
    }

    const runId = this.generateRunId();
    this.running = true;
    const startedAt = Date.now();
    const startedIso = new Date(startedAt).toISOString();
    const results: StepResult[] = [];
    let failedAtStep: string | undefined;

    this.publish({
      kind: 'run:start',
      runId,
      timestamp: startedIso,
      trigger,
    });
    await this.appendActivityLog({
      timestamp: startedIso,
      action: 'run:start',
      provider: 'core',
      status: dryRun ? 'dry-run' : 'success',
      runId,
      trigger,
      kind: 'start',
    });

    try {
      for (const step of steps) {
        const result = await this.executeStep(step, {
          runId,
          trigger,
          dryRun,
          callbacks,
        });
        results.push(result);

        if (result.status === 'failed') {
          failedAtStep = step.id;
          break;
        }
      }
    } finally {
      this.running = false;
    }

    const completedAt = Date.now();
    const completedIso = new Date(completedAt).toISOString();

    let status: DeployReport['status'];
    if (dryRun) {
      status = 'success';
    } else if (failedAtStep) {
      status = results.length === 1 ? 'failed' : 'partial';
    } else {
      status = 'success';
    }

    if (dryRun) {
      this.publish({
        kind: 'run:dry-run',
        runId,
        timestamp: completedIso,
        trigger,
        status,
      });
    } else {
      this.publish({
        kind: 'run:complete',
        runId,
        timestamp: completedIso,
        trigger,
        status: failedAtStep ? 'failed' : 'success',
      });
    }
    await this.appendActivityLog({
      timestamp: completedIso,
      action: dryRun ? 'run:dry-run' : 'run:complete',
      provider: 'core',
      status: dryRun ? 'dry-run' : failedAtStep ? 'failed' : 'success',
      runId,
      trigger,
      kind: 'end',
      durationMs: completedAt - startedAt,
    });

    return {
      status,
      startedAt: startedIso,
      completedAt: completedIso,
      totalDurationMs: completedAt - startedAt,
      steps: results,
      ...(failedAtStep ? { failedAtStep } : {}),
      runId,
      trigger,
    };
  }

  private async executeStep(
    step: PluginDeployStep,
    ctx: StepContext,
  ): Promise<StepResult> {
    const stepState: DeployStepState = {
      id: step.id,
      label: step.label,
      status: 'running',
      detail: '',
      startedAt: Date.now(),
      completedAt: null,
    };

    const stepStartIso = new Date(stepState.startedAt!).toISOString();
    this.publish({
      kind: 'step:start',
      runId: ctx.runId,
      timestamp: stepStartIso,
      stepId: step.id,
      label: step.label,
      provider: step.provider,
    });
    ctx.callbacks?.onStepStart?.(stepState);
    const start = Date.now();

    // Dry-run short-circuit — never call step.execute().
    if (ctx.dryRun) {
      const durationMs = Date.now() - start;
      const detail = `Would execute: ${step.label}`;
      stepState.status = 'success';
      stepState.detail = detail;
      stepState.completedAt = Date.now();

      const result: StepResult = {
        stepId: step.id,
        status: 'dry-run',
        durationMs,
        detail,
      };
      this.publish({
        kind: 'step:complete',
        runId: ctx.runId,
        timestamp: new Date(stepState.completedAt).toISOString(),
        stepId: step.id,
        label: step.label,
        provider: step.provider,
        durationMs,
        detail,
      });
      ctx.callbacks?.onStepComplete?.(stepState, result);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: step.id,
        provider: step.provider,
        status: 'dry-run',
        durationMs,
        runId: ctx.runId,
        trigger: ctx.trigger,
        kind: 'step',
        stepId: step.id,
      });
      return result;
    }

    try {
      const detail = await step.execute();
      const durationMs = Date.now() - start;
      stepState.status = 'success';
      stepState.detail = detail;
      stepState.completedAt = Date.now();

      const result: StepResult = { stepId: step.id, status: 'success', durationMs, detail };
      this.publish({
        kind: 'step:complete',
        runId: ctx.runId,
        timestamp: new Date(stepState.completedAt).toISOString(),
        stepId: step.id,
        label: step.label,
        provider: step.provider,
        durationMs,
        detail,
      });
      ctx.callbacks?.onStepComplete?.(stepState, result);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: step.id,
        provider: step.provider,
        status: 'success',
        durationMs,
        runId: ctx.runId,
        trigger: ctx.trigger,
        kind: 'step',
        stepId: step.id,
      });
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err : new Error(String(err));
      stepState.status = 'failed';
      stepState.detail = error.message;
      stepState.completedAt = Date.now();

      this.publish({
        kind: 'step:fail',
        runId: ctx.runId,
        timestamp: new Date(stepState.completedAt).toISOString(),
        stepId: step.id,
        label: step.label,
        provider: step.provider,
        durationMs,
        error: error.message,
      });
      ctx.callbacks?.onStepFail?.(stepState, error);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: step.id,
        provider: step.provider,
        status: 'failed',
        durationMs,
        error: error.message,
        runId: ctx.runId,
        trigger: ctx.trigger,
        kind: 'step',
        stepId: step.id,
      });
      return { stepId: step.id, status: 'failed', durationMs, error: error.message };
    }
  }

  private async appendActivityLog(entry: ActivityLogEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry) + '\n';
      const file = Bun.file(this.activityLogPath);
      const exists = await file.exists();
      const existing = exists ? await file.text() : '';
      await Bun.write(this.activityLogPath, existing + line);
    } catch {
      // Best-effort
    }
  }

  private publish(event: DeployEvent): void {
    this.eventBus?.publish(event);
  }

  private generateRunId(): string {
    return crypto.randomUUID();
  }

  /**
   * Group JSONL entries by runId. V1 entries without a runId are clustered by
   * timestamp proximity (<30s gap forms one synthetic run).
   */
  private async groupEntriesByRun(): Promise<
    Array<{ runId: string; entries: ActivityLogEntry[] }>
  > {
    const all = await this.readAllEntries();
    const byRunId = new Map<string, ActivityLogEntry[]>();
    const v1: ActivityLogEntry[] = [];

    for (const entry of all) {
      if (entry.runId) {
        const list = byRunId.get(entry.runId) ?? [];
        list.push(entry);
        byRunId.set(entry.runId, list);
      } else {
        v1.push(entry);
      }
    }

    // Cluster v1 entries by timestamp proximity. Entries arrive in file order.
    v1.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    const THIRTY_SECONDS = 30_000;
    let currentBucket: ActivityLogEntry[] = [];
    let lastTs = -Infinity;
    const v1Buckets: ActivityLogEntry[][] = [];
    for (const entry of v1) {
      const ts = Date.parse(entry.timestamp);
      if (currentBucket.length === 0 || ts - lastTs <= THIRTY_SECONDS) {
        currentBucket.push(entry);
      } else {
        v1Buckets.push(currentBucket);
        currentBucket = [entry];
      }
      lastTs = ts;
    }
    if (currentBucket.length > 0) v1Buckets.push(currentBucket);

    const results: Array<{ runId: string; entries: ActivityLogEntry[] }> = [];
    for (const [runId, entries] of byRunId) {
      results.push({ runId, entries });
    }
    for (const bucket of v1Buckets) {
      const firstTs = Date.parse(bucket[0]!.timestamp);
      results.push({ runId: `legacy-${firstTs}`, entries: bucket });
    }
    return results;
  }

  private async readAllEntries(): Promise<ActivityLogEntry[]> {
    try {
      const file = Bun.file(this.activityLogPath);
      const exists = await file.exists();
      if (!exists) return [];
      const text = await file.text();
      const lines = text.trim().split('\n').filter(Boolean);
      return lines.map((line) => JSON.parse(line) as ActivityLogEntry);
    } catch {
      return [];
    }
  }

  private summarizeRun(runId: string, entries: ActivityLogEntry[]): RunSummary {
    const sorted = [...entries].sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : 1,
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const stepEntries = sorted.filter(
      (e) => e.kind === 'step' || (!e.kind && e.action !== 'run:start' && e.action !== 'run:complete' && e.action !== 'run:dry-run'),
    );
    const endMarker = sorted.find((e) => e.kind === 'end');
    const trigger: DeployTrigger =
      first.trigger ?? endMarker?.trigger ?? 'full';

    let status: RunSummary['status'];
    if (endMarker) {
      if (endMarker.status === 'dry-run' || endMarker.action === 'run:dry-run') {
        status = 'dry-run';
      } else if (endMarker.status === 'failed') {
        // partial if at least one step succeeded, otherwise failed
        const anySuccess = stepEntries.some((e) => e.status === 'success');
        status = anySuccess ? 'partial' : 'failed';
      } else {
        status = 'success';
      }
    } else {
      // No end marker — either v1 entries or an in-progress run.
      const anyFailed = stepEntries.some((e) => e.status === 'failed');
      const anySuccess = stepEntries.some((e) => e.status === 'success');
      if (anyFailed && anySuccess) status = 'partial';
      else if (anyFailed) status = 'failed';
      else status = 'success';
    }

    return {
      runId,
      trigger,
      startedAt: first.timestamp,
      finishedAt: last.timestamp,
      status,
      stepCount: stepEntries.length,
    };
  }
}

/**
 * Disambiguate the legacy bare-callbacks call from the new options bag.
 * An object with `dryRun` or `callbacks` keys is treated as {@link FullDeployOptions};
 * anything else is treated as legacy {@link ProgressCallbacks}.
 */
function normalizeFullDeployArg(
  arg: FullDeployOptions | ProgressCallbacks | undefined,
): { dryRun?: boolean; callbacks?: ProgressCallbacks } {
  if (!arg) return {};
  const asOpts = arg as FullDeployOptions;
  if ('dryRun' in asOpts || 'callbacks' in asOpts) {
    return { dryRun: asOpts.dryRun, callbacks: asOpts.callbacks };
  }
  return { callbacks: arg as ProgressCallbacks };
}
