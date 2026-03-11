import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  DeployOrchestrator,
  DeployInProgressError,
  type DeployOrchestratorConfig,
  type ProgressCallbacks,
  type DeployStepState,
  type StepResult,
} from '../deploy-orchestrator.js';
import type { ProviderHealth } from '../../types/provider.js';
import type { DeploymentEntry } from '../../types/vercel.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// --- Mock factories ---

function healthyProvider(name: string): ProviderHealth {
  return {
    provider: name,
    status: 'healthy',
    label: `${name} OK`,
    details: {},
    checkedAt: Date.now(),
  };
}

function makeDeployment(overrides: Partial<DeploymentEntry> = {}): DeploymentEntry {
  return {
    uid: 'dpl_abc123',
    commitSha: 'abc123',
    commitMessage: 'test',
    branch: 'main',
    target: 'production',
    status: 'READY',
    duration: 30000,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<DeployOrchestratorConfig> = {}): DeployOrchestratorConfig {
  const logPath = join(tmpdir(), `deploy-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);

  return {
    supabase: {
      pushMigrations: mock(() =>
        Promise.resolve({ applied: ['001_init.sql'], errors: [] }),
      ),
      deployAllFunctions: mock(() =>
        Promise.resolve({ deployed: ['hello-world'], failed: [] }),
      ),
      healthCheck: mock(() => Promise.resolve(healthyProvider('supabase'))),
    },
    vercel: {
      triggerRedeploy: mock((_id: string) => Promise.resolve('dpl_new456')),
      pollDeployment: mock((_uid: string) =>
        Promise.resolve(makeDeployment({ uid: 'dpl_new456', status: 'READY' })),
      ),
      getCurrentDeployment: mock(() => Promise.resolve(makeDeployment())),
      healthCheck: mock(() => Promise.resolve(healthyProvider('vercel'))),
    },
    vaultClient: {
      health: mock(() =>
        Promise.resolve({ connected: true, locked: false, name: 'test-vault' }),
      ),
      listSecrets: mock(() => Promise.resolve(['SECRET_A'])),
      getSecret: mock((_name: string) => Promise.resolve('value')),
      getAll: mock(() => Promise.resolve(new Map([['SECRET_A', 'value']]))),
      getStatus: mock(() =>
        Promise.resolve({ connected: true, locked: false, name: 'test-vault', secretCount: 1 }),
      ),
    },
    syncEngine: {
      syncAll: mock(() => Promise.resolve({ synced: 3, failed: 0, errors: [] })),
    },
    pollIntervalMs: 10,
    buildTimeoutMs: 200,
    activityLogPath: logPath,
    ...overrides,
  };
}

describe('DeployOrchestrator', () => {
  let config: DeployOrchestratorConfig;
  let orchestrator: DeployOrchestrator;

  beforeEach(() => {
    config = makeConfig();
    orchestrator = new DeployOrchestrator(config);
  });

  // 1. fullDeploy — all steps succeed
  it('fullDeploy succeeds with all 6 steps', async () => {
    const report = await orchestrator.fullDeploy();

    expect(report.status).toBe('success');
    expect(report.steps).toHaveLength(6);
    expect(report.steps.every((s) => s.status === 'success')).toBe(true);
    expect(report.failedAtStep).toBeUndefined();
    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.startedAt).toBeTruthy();
    expect(report.completedAt).toBeTruthy();
  });

  // 2. fullDeploy — step 3 fails → partial report
  it('fullDeploy halts on step failure and returns partial report', async () => {
    (config.supabase.deployAllFunctions as ReturnType<typeof mock>).mockImplementation(
      () => Promise.resolve({ deployed: [], failed: [{ name: 'fn1', error: 'compile error' }] }),
    );

    const report = await orchestrator.fullDeploy();

    expect(report.status).toBe('partial');
    expect(report.failedAtStep).toBe('deployFunctions');
    expect(report.steps).toHaveLength(3);
    expect(report.steps[0]!.status).toBe('success'); // syncSecrets
    expect(report.steps[1]!.status).toBe('success'); // pushMigrations
    expect(report.steps[2]!.status).toBe('failed');  // deployFunctions
  });

  // 3. fullDeploy — vault locked → throws
  it('fullDeploy throws when vault is locked', async () => {
    (config.vaultClient.health as ReturnType<typeof mock>).mockImplementation(
      () => Promise.resolve({ connected: true, locked: true, name: 'test-vault' }),
    );

    await expect(orchestrator.fullDeploy()).rejects.toThrow('Vault is locked');
    expect(orchestrator.isRunning).toBe(false);
  });

  // 4. fullDeploy — already running → DeployInProgressError
  it('fullDeploy throws DeployInProgressError when already running', async () => {
    // Make syncAll hang to keep deploy running
    let resolveSyncAll: () => void;
    const syncPromise = new Promise<void>((r) => { resolveSyncAll = r; });
    (config.syncEngine.syncAll as ReturnType<typeof mock>).mockImplementation(
      () => syncPromise.then(() => ({ synced: 1, failed: 0, errors: [] })),
    );

    const firstDeploy = orchestrator.fullDeploy();
    // Small delay to ensure deploy has started
    await new Promise((r) => setTimeout(r, 5));

    expect(orchestrator.isRunning).toBe(true);
    await expect(orchestrator.fullDeploy()).rejects.toThrow(DeployInProgressError);

    resolveSyncAll!();
    await firstDeploy;
  });

  // 5. stepDeploy — single step works
  it('stepDeploy executes a single step', async () => {
    const result = await orchestrator.stepDeploy('pushMigrations');

    expect(result.stepId).toBe('pushMigrations');
    expect(result.status).toBe('success');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.detail).toContain('Applied 1 migrations');
  });

  // 6. stepDeploy — during full deploy throws
  it('stepDeploy throws when full deploy is running', async () => {
    let resolveSyncAll: () => void;
    const syncPromise = new Promise<void>((r) => { resolveSyncAll = r; });
    (config.syncEngine.syncAll as ReturnType<typeof mock>).mockImplementation(
      () => syncPromise.then(() => ({ synced: 1, failed: 0, errors: [] })),
    );

    const firstDeploy = orchestrator.fullDeploy();
    await new Promise((r) => setTimeout(r, 5));

    await expect(orchestrator.stepDeploy('healthCheck')).rejects.toThrow(
      DeployInProgressError,
    );

    resolveSyncAll!();
    await firstDeploy;
  });

  // 7. Progress callbacks fire correctly
  it('progress callbacks fire for each step', async () => {
    const starts: string[] = [];
    const completes: string[] = [];
    const callbacks: ProgressCallbacks = {
      onStepStart: (step: DeployStepState) => starts.push(step.id),
      onStepComplete: (step: DeployStepState, _result: StepResult) =>
        completes.push(step.id),
    };

    await orchestrator.fullDeploy(callbacks);

    expect(starts).toHaveLength(6);
    expect(completes).toHaveLength(6);
    expect(starts[0]).toBe('syncSecrets');
    expect(starts[5]).toBe('healthCheck');
  });

  // 8. Activity log written after steps
  it('activity log is written after each step', async () => {
    await orchestrator.fullDeploy();

    const entries = await orchestrator.getActivityLog();
    expect(entries.length).toBe(6);
    // Most recent first
    expect(entries[0]!.action).toBe('healthCheck');
    expect(entries[5]!.action).toBe('syncSecrets');
  });

  // 9. Activity log read with limit
  it('getActivityLog respects limit parameter', async () => {
    await orchestrator.fullDeploy();

    const entries = await orchestrator.getActivityLog(2);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.action).toBe('healthCheck');
    expect(entries[1]!.action).toBe('waitForBuild');
  });

  // 10. waitForBuild polls then succeeds
  it('waitForBuild polls until READY', async () => {
    let pollCount = 0;
    (config.vercel.pollDeployment as ReturnType<typeof mock>).mockImplementation(
      () => {
        pollCount++;
        const status = pollCount >= 3 ? 'READY' : 'BUILDING';
        return Promise.resolve(makeDeployment({ uid: 'dpl_new456', status }));
      },
    );

    const result = await orchestrator.stepDeploy('waitForBuild');

    expect(result.status).toBe('success');
    expect(pollCount).toBeGreaterThanOrEqual(3);
  });

  // 11. waitForBuild timeout fails
  it('waitForBuild fails on timeout', async () => {
    (config.vercel.pollDeployment as ReturnType<typeof mock>).mockImplementation(
      () => Promise.resolve(makeDeployment({ uid: 'dpl_new456', status: 'BUILDING' })),
    );

    const shortTimeout = makeConfig({
      ...config,
      pollIntervalMs: 10,
      buildTimeoutMs: 50,
    });
    const orch = new DeployOrchestrator(shortTimeout);

    const result = await orch.stepDeploy('waitForBuild');

    expect(result.status).toBe('failed');
    expect(result.error).toContain('timed out');
  });
});
