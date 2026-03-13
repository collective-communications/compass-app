import type { VaultClient } from '../types/vault.js';
import type { ActivityLogEntry } from '../types/activity.js';
import type { PluginDeployStep } from '../types/plugin.js';
import { join } from 'node:path';

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
  status: 'success' | 'failed' | 'skipped';
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
  private readonly activityLogPath: string;
  private running = false;

  constructor(config: DeployOrchestratorConfig) {
    this.config = config;
    this.activityLogPath =
      config.activityLogPath ??
      join(import.meta.dir, '..', '..', 'activity.json');
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Execute all deployment steps in order. Halts on failure. */
  async fullDeploy(callbacks?: ProgressCallbacks): Promise<DeployReport> {
    if (this.running) {
      throw new DeployInProgressError();
    }

    const vaultHealth = await this.config.vaultClient.health();
    if (vaultHealth.locked) {
      throw new Error('Vault is locked — unlock before deploying');
    }

    this.running = true;
    const startedAt = Date.now();
    const results: StepResult[] = [];
    let failedAtStep: string | undefined;

    try {
      for (const step of this.config.steps) {
        const result = await this.executeStep(step, callbacks);
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
    const status = failedAtStep
      ? results.length === 1 ? 'failed' : 'partial'
      : 'success';

    return {
      status,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date(completedAt).toISOString(),
      totalDurationMs: completedAt - startedAt,
      steps: results,
      ...(failedAtStep ? { failedAtStep } : {}),
    };
  }

  /** Execute a single step by ID. */
  async stepDeploy(stepId: string, callbacks?: ProgressCallbacks): Promise<StepResult> {
    if (this.running) {
      throw new DeployInProgressError();
    }
    const step = this.config.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Unknown step: ${stepId}`);
    }
    return this.executeStep(step, callbacks);
  }

  /** Read activity log entries, most recent first. */
  async getActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
    try {
      const file = Bun.file(this.activityLogPath);
      const exists = await file.exists();
      if (!exists) return [];
      const text = await file.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const entries = lines.map((line) => JSON.parse(line) as ActivityLogEntry);
      return entries.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  // --- Private ---

  private async executeStep(
    step: PluginDeployStep,
    callbacks?: ProgressCallbacks,
  ): Promise<StepResult> {
    const stepState: DeployStepState = {
      id: step.id,
      label: step.label,
      status: 'running',
      detail: '',
      startedAt: Date.now(),
      completedAt: null,
    };

    callbacks?.onStepStart?.(stepState);
    const start = Date.now();

    try {
      const detail = await step.execute();
      const durationMs = Date.now() - start;
      stepState.status = 'success';
      stepState.detail = detail;
      stepState.completedAt = Date.now();

      const result: StepResult = { stepId: step.id, status: 'success', durationMs, detail };
      callbacks?.onStepComplete?.(stepState, result);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: step.id,
        provider: step.provider,
        status: 'success',
        durationMs,
      });
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err : new Error(String(err));
      stepState.status = 'failed';
      stepState.detail = error.message;
      stepState.completedAt = Date.now();

      callbacks?.onStepFail?.(stepState, error);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: step.id,
        provider: step.provider,
        status: 'failed',
        durationMs,
        error: error.message,
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
}
