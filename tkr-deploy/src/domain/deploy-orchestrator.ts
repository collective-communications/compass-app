import type { VaultClient } from '../types/vault.js';
import type { ProviderHealth } from '../types/provider.js';
import type { DeploymentEntry } from '../types/vercel.js';
import type { ActivityLogEntry } from '../types/activity.js';
import { join } from 'node:path';

// --- Types ---

export type DeployStepId =
  | 'syncSecrets'
  | 'pushMigrations'
  | 'deployFunctions'
  | 'triggerBuild'
  | 'waitForBuild'
  | 'healthCheck';

export interface DeployStepState {
  id: DeployStepId;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  detail: string;
  startedAt: number | null;
  completedAt: number | null;
}

export interface StepResult {
  stepId: DeployStepId;
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
  failedAtStep?: DeployStepId;
}

export interface ProgressCallbacks {
  onStepStart?(step: DeployStepState): void;
  onStepComplete?(step: DeployStepState, result: StepResult): void;
  onStepFail?(step: DeployStepState, error: Error): void;
}

export interface SyncAllReport {
  synced: number;
  failed: number;
  errors: string[];
}

export interface DeployOrchestratorConfig {
  supabase: {
    pushMigrations(): Promise<{ applied: string[]; errors: string[] }>;
    deployAllFunctions(): Promise<{
      deployed: string[];
      failed: Array<{ name: string; error: string }>;
    }>;
    healthCheck(): Promise<ProviderHealth>;
  };
  vercel: {
    triggerRedeploy(id: string): Promise<string>;
    pollDeployment(uid: string): Promise<DeploymentEntry>;
    getCurrentDeployment(): Promise<DeploymentEntry | null>;
    healthCheck(): Promise<ProviderHealth>;
  };
  vaultClient: VaultClient;
  syncEngine: { syncAll(): Promise<SyncAllReport> };
  /** Override for testing — poll interval in ms (default 5000) */
  pollIntervalMs?: number;
  /** Override for testing — build timeout in ms (default 300000) */
  buildTimeoutMs?: number;
  /** Override for activity log path (default: tkr-deploy/activity.json) */
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

// --- Step definitions ---

const STEP_DEFS: Array<{ id: DeployStepId; label: string }> = [
  { id: 'syncSecrets', label: 'Sync secrets to providers' },
  { id: 'pushMigrations', label: 'Push database migrations' },
  { id: 'deployFunctions', label: 'Deploy edge functions' },
  { id: 'triggerBuild', label: 'Trigger Vercel build' },
  { id: 'waitForBuild', label: 'Wait for build completion' },
  { id: 'healthCheck', label: 'Health check all providers' },
];

// --- Orchestrator ---

export class DeployOrchestrator {
  private readonly config: DeployOrchestratorConfig;
  private readonly pollIntervalMs: number;
  private readonly buildTimeoutMs: number;
  private readonly activityLogPath: string;
  private running = false;

  constructor(config: DeployOrchestratorConfig) {
    this.config = config;
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    this.buildTimeoutMs = config.buildTimeoutMs ?? 300_000;
    this.activityLogPath =
      config.activityLogPath ??
      join(import.meta.dir, '..', '..', 'activity.json');
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Execute all 6 deployment steps in order. Halts on failure. */
  async fullDeploy(callbacks?: ProgressCallbacks): Promise<DeployReport> {
    if (this.running) {
      throw new DeployInProgressError();
    }

    // Pre-flight: vault must be unlocked
    const vaultHealth = await this.config.vaultClient.health();
    if (vaultHealth.locked) {
      throw new Error('Vault is locked — unlock before deploying');
    }

    this.running = true;
    const startedAt = Date.now();
    const results: StepResult[] = [];
    let failedAtStep: DeployStepId | undefined;

    try {
      for (const def of STEP_DEFS) {
        const result = await this.executeStep(def.id, callbacks);
        results.push(result);

        if (result.status === 'failed') {
          failedAtStep = def.id;
          break;
        }
      }
    } finally {
      this.running = false;
    }

    const completedAt = Date.now();
    const status = failedAtStep
      ? results.length === 1
        ? 'failed'
        : 'partial'
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

  /** Execute a single step by ID. Throws if a full deploy is running. */
  async stepDeploy(
    stepId: DeployStepId,
    callbacks?: ProgressCallbacks,
  ): Promise<StepResult> {
    if (this.running) {
      throw new DeployInProgressError();
    }
    return this.executeStep(stepId, callbacks);
  }

  /** Read activity log entries, most recent first. */
  async getActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
    try {
      const file = Bun.file(this.activityLogPath);
      const exists = await file.exists();
      if (!exists) return [];
      const text = await file.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const entries = lines.map(
        (line) => JSON.parse(line) as ActivityLogEntry,
      );
      return entries.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  // --- Private ---

  private async executeStep(
    stepId: DeployStepId,
    callbacks?: ProgressCallbacks,
  ): Promise<StepResult> {
    const def = STEP_DEFS.find((d) => d.id === stepId);
    if (!def) {
      throw new Error(`Unknown step: ${stepId}`);
    }

    const stepState: DeployStepState = {
      id: stepId,
      label: def.label,
      status: 'running',
      detail: '',
      startedAt: Date.now(),
      completedAt: null,
    };

    callbacks?.onStepStart?.(stepState);
    const start = Date.now();

    try {
      const detail = await this.runStep(stepId);
      const durationMs = Date.now() - start;
      stepState.status = 'success';
      stepState.detail = detail;
      stepState.completedAt = Date.now();

      const result: StepResult = {
        stepId,
        status: 'success',
        durationMs,
        detail,
      };
      callbacks?.onStepComplete?.(stepState, result);
      await this.appendActivityLog({
        timestamp: new Date().toISOString(),
        action: stepId,
        provider: this.providerFor(stepId),
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
        action: stepId,
        provider: this.providerFor(stepId),
        status: 'failed',
        durationMs,
        error: error.message,
      });
      return {
        stepId,
        status: 'failed',
        durationMs,
        error: error.message,
      };
    }
  }

  private async runStep(stepId: DeployStepId): Promise<string> {
    const { supabase, vercel, syncEngine } = this.config;

    switch (stepId) {
      case 'syncSecrets': {
        const report = await syncEngine.syncAll();
        return `Synced ${report.synced} secrets, ${report.failed} failed`;
      }
      case 'pushMigrations': {
        const result = await supabase.pushMigrations();
        if (result.errors.length > 0) {
          throw new Error(`Migration errors: ${result.errors.join(', ')}`);
        }
        return `Applied ${result.applied.length} migrations`;
      }
      case 'deployFunctions': {
        const result = await supabase.deployAllFunctions();
        if (result.failed.length > 0) {
          throw new Error(
            `Function deploy failures: ${result.failed.map((f) => f.name).join(', ')}`,
          );
        }
        return `Deployed ${result.deployed.length} functions`;
      }
      case 'triggerBuild': {
        const current = await vercel.getCurrentDeployment();
        if (!current) {
          throw new Error('No current deployment found to redeploy');
        }
        const newUid = await vercel.triggerRedeploy(current.uid);
        return `Triggered build ${newUid}`;
      }
      case 'waitForBuild': {
        return await this.waitForBuild();
      }
      case 'healthCheck': {
        const [sbHealth, vcHealth] = await Promise.all([
          supabase.healthCheck(),
          vercel.healthCheck(),
        ]);
        const issues: string[] = [];
        if (sbHealth.status !== 'healthy') issues.push(`supabase: ${sbHealth.status}`);
        if (vcHealth.status !== 'healthy') issues.push(`vercel: ${vcHealth.status}`);
        if (issues.length > 0) {
          throw new Error(`Health check failed: ${issues.join(', ')}`);
        }
        return 'All providers healthy';
      }
    }
  }

  private async waitForBuild(): Promise<string> {
    const { vercel } = this.config;
    const current = await vercel.getCurrentDeployment();
    if (!current) {
      throw new Error('No deployment to poll');
    }

    const deadline = Date.now() + this.buildTimeoutMs;

    while (Date.now() < deadline) {
      const deployment = await vercel.pollDeployment(current.uid);
      if (deployment.status === 'READY') {
        return `Build ${deployment.uid} ready`;
      }
      if (deployment.status === 'ERROR' || deployment.status === 'CANCELED') {
        throw new Error(`Build ${deployment.uid} ${deployment.status.toLowerCase()}`);
      }
      await this.sleep(this.pollIntervalMs);
    }

    throw new Error(`Build timed out after ${this.buildTimeoutMs}ms`);
  }

  private providerFor(stepId: DeployStepId): string {
    switch (stepId) {
      case 'syncSecrets':
        return 'vault';
      case 'pushMigrations':
      case 'deployFunctions':
        return 'supabase';
      case 'triggerBuild':
      case 'waitForBuild':
        return 'vercel';
      case 'healthCheck':
        return 'all';
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
      // Best-effort — log write failure doesn't fail deployment
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
