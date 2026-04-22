import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  DeployOrchestrator,
  DeployInProgressError,
  type DeployOrchestratorConfig,
  type ProgressCallbacks,
  type DeployStepState,
  type StepResult,
} from '../deploy-orchestrator.js';
import { EventBus, type DeployEvent } from '../event-bus.js';
import type { PluginDeployStep } from '../../types/plugin.js';
import type { ActivityLogEntry } from '../../types/activity.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';

// --- Mock factories ---

function makeConfig(overrides: Partial<DeployOrchestratorConfig> = {}): DeployOrchestratorConfig {
  const logPath = join(tmpdir(), `deploy-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);

  const steps: PluginDeployStep[] = [
    {
      id: 'syncSecrets',
      label: 'Sync secrets',
      provider: 'core',
      order: 0,
      execute: mock(() => Promise.resolve('Synced 3 secrets')),
    },
    {
      id: 'pushMigrations',
      label: 'Push database migrations',
      provider: 'supabase',
      order: 100,
      execute: mock(() => Promise.resolve('Applied 1 migrations')),
    },
    {
      id: 'deployFunctions',
      label: 'Deploy edge functions',
      provider: 'supabase',
      order: 200,
      execute: mock(() => Promise.resolve('Deployed 1 function(s)')),
    },
    {
      id: 'triggerRedeploy',
      label: 'Trigger redeploy',
      provider: 'vercel',
      order: 300,
      execute: mock(() => Promise.resolve('Triggered redeploy dpl_new456')),
    },
    {
      id: 'waitForBuild',
      label: 'Wait for build',
      provider: 'vercel',
      order: 400,
      execute: mock(() => Promise.resolve('Build complete: dpl_new456 READY')),
    },
    {
      id: 'healthCheck',
      label: 'Health check',
      provider: 'core',
      order: 900,
      execute: mock(() => Promise.resolve('All providers healthy')),
    },
  ];

  return {
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
    steps,
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
    (config.steps[2].execute as ReturnType<typeof mock>).mockImplementation(
      () => Promise.reject(new Error('compile error')),
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
    // Make syncSecrets hang to keep deploy running
    let resolveSyncAll: () => void;
    const syncPromise = new Promise<void>((r) => { resolveSyncAll = r; });
    (config.steps[0].execute as ReturnType<typeof mock>).mockImplementation(
      () => syncPromise.then(() => 'Synced'),
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
    (config.steps[0].execute as ReturnType<typeof mock>).mockImplementation(
      () => syncPromise.then(() => 'Synced'),
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
  it('waitForBuild step can be executed individually', async () => {
    const result = await orchestrator.stepDeploy('waitForBuild');

    expect(result.status).toBe('success');
  });

  // 11. step failure returns failed result
  it('step failure returns failed result with error', async () => {
    (config.steps[4].execute as ReturnType<typeof mock>).mockImplementation(
      () => Promise.reject(new Error('Build timed out')),
    );

    const result = await orchestrator.stepDeploy('waitForBuild');

    expect(result.status).toBe('failed');
    expect(result.error).toContain('timed out');
  });
});

// ---------------------------------------------------------------------------
// Phase E1 — new test blocks for resume, dry-run, listRuns/getRun, EventBus
// ---------------------------------------------------------------------------

describe('resumeFromStep', () => {
  let config: DeployOrchestratorConfig;
  let orchestrator: DeployOrchestrator;

  beforeEach(() => {
    config = makeConfig();
    orchestrator = new DeployOrchestrator(config);
  });

  it('resumes from a middle step, only executes that step and later ones', async () => {
    const report = await orchestrator.resumeFromStep('deployFunctions');

    // Should only have run deployFunctions, triggerRedeploy, waitForBuild, healthCheck (4 steps)
    expect(report.steps).toHaveLength(4);
    expect(report.steps[0]!.stepId).toBe('deployFunctions');
    expect(report.steps[3]!.stepId).toBe('healthCheck');
    expect(report.status).toBe('success');

    // Earlier steps should NOT have been called
    expect(config.steps[0].execute).not.toHaveBeenCalled(); // syncSecrets
    expect(config.steps[1].execute).not.toHaveBeenCalled(); // pushMigrations
  });

  it('throws for an unknown stepId', async () => {
    await expect(orchestrator.resumeFromStep('nonexistent')).rejects.toThrow(
      'Unknown step: nonexistent',
    );
  });

  it('generates a unique runId', async () => {
    const report1 = await orchestrator.resumeFromStep('healthCheck');
    const report2 = await orchestrator.resumeFromStep('healthCheck');

    expect(report1.runId).toBeTruthy();
    expect(report2.runId).toBeTruthy();
    expect(report1.runId).not.toBe(report2.runId);
  });

  it('activity log entries have trigger: resume', async () => {
    const report = await orchestrator.resumeFromStep('healthCheck');
    expect(report.trigger).toBe('resume');

    const _log = await orchestrator.getActivityLog(50);
    // The step-level entry should carry 'resume' trigger via the run
    // The orchestrator writes all entries with the run's trigger
    const entries = await readJsonlEntries(orchestrator.activityLogPath);
    const stepEntries = entries.filter((e) => e.kind === 'step');
    for (const entry of stepEntries) {
      expect(entry.trigger).toBe('resume');
    }
  });
});

describe('fullDeploy dry-run', () => {
  let config: DeployOrchestratorConfig;
  let orchestrator: DeployOrchestrator;

  beforeEach(() => {
    config = makeConfig();
    orchestrator = new DeployOrchestrator(config);
  });

  it('no step execute() functions are called', async () => {
    await orchestrator.fullDeploy({ dryRun: true });

    for (const step of config.steps) {
      expect(step.execute).not.toHaveBeenCalled();
    }
  });

  it('returns a DeployReport with all steps marked dry-run', async () => {
    const report = await orchestrator.fullDeploy({ dryRun: true });

    expect(report.status).toBe('success');
    expect(report.steps).toHaveLength(6);
    for (const step of report.steps) {
      expect(step.status).toBe('dry-run');
    }
    expect(report.trigger).toBe('dry-run');
  });

  it('activity log entries have status: dry-run', async () => {
    await orchestrator.fullDeploy({ dryRun: true });

    const entries = await readJsonlEntries(orchestrator.activityLogPath);
    const stepEntries = entries.filter((e) => e.kind === 'step');
    expect(stepEntries.length).toBe(6);
    for (const entry of stepEntries) {
      expect(entry.status).toBe('dry-run');
    }
  });

  it('runId is threaded through all entries', async () => {
    const report = await orchestrator.fullDeploy({ dryRun: true });
    const runId = report.runId;
    expect(runId).toBeTruthy();

    const entries = await readJsonlEntries(orchestrator.activityLogPath);
    for (const entry of entries) {
      expect(entry.runId).toBe(runId);
    }
  });
});

describe('listRuns / getRun', () => {
  it('after a fullDeploy, listRuns returns at least one run', async () => {
    const config = makeConfig();
    const orchestrator = new DeployOrchestrator(config);

    const report = await orchestrator.fullDeploy();
    const runs = await orchestrator.listRuns();

    expect(runs.length).toBeGreaterThanOrEqual(1);
    const match = runs.find((r) => r.runId === report.runId);
    expect(match).toBeTruthy();
    expect(match!.trigger).toBe('full');
    expect(match!.status).toBe('success');
  });

  it('getRun(runId) returns matching entries', async () => {
    const config = makeConfig();
    const orchestrator = new DeployOrchestrator(config);

    const report = await orchestrator.fullDeploy();
    const result = await orchestrator.getRun(report.runId);

    expect(result).not.toBeNull();
    expect(result!.run.runId).toBe(report.runId);
    // 6 step entries + 1 run:start + 1 run:complete = 8
    expect(result!.entries.length).toBe(8);
  });

  it('getRun with nonexistent runId returns null', async () => {
    const config = makeConfig();
    const orchestrator = new DeployOrchestrator(config);

    const result = await orchestrator.getRun('nonexistent');
    expect(result).toBeNull();
  });

  it('v1 entries without runId are grouped into synthetic runs by timestamp proximity', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'orch-v1-'));
    const logPath = join(tmpDir, 'activity.jsonl');

    const baseTime = Date.parse('2026-01-15T10:00:00.000Z');
    // Cluster 1: three entries within 30s
    const v1Entries: ActivityLogEntry[] = [
      { timestamp: new Date(baseTime).toISOString(), action: 'syncSecrets', provider: 'core', status: 'success' },
      { timestamp: new Date(baseTime + 5_000).toISOString(), action: 'pushMigrations', provider: 'supabase', status: 'success' },
      { timestamp: new Date(baseTime + 10_000).toISOString(), action: 'deployFunctions', provider: 'supabase', status: 'success' },
      // Cluster 2: two entries 60s later (gap > 30s)
      { timestamp: new Date(baseTime + 60_000).toISOString(), action: 'triggerRedeploy', provider: 'vercel', status: 'success' },
      { timestamp: new Date(baseTime + 65_000).toISOString(), action: 'healthCheck', provider: 'core', status: 'success' },
    ];
    const content = v1Entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    writeFileSync(logPath, content);

    const orchestrator = new DeployOrchestrator(makeConfig({ activityLogPath: logPath }));
    const runs = await orchestrator.listRuns();

    expect(runs.length).toBe(2);
    // Synthetic run ids should start with 'legacy-'
    for (const run of runs) {
      expect(run.runId).toMatch(/^legacy-/);
    }

    // First cluster should have 3 steps, second should have 2
    const runDetails = await Promise.all(runs.map((r) => orchestrator.getRun(r.runId)));
    const counts = runDetails.map((r) => r!.entries.length).sort((a, b) => a - b);
    expect(counts).toEqual([2, 3]);
  });
});

describe('EventBus integration', () => {
  it('fullDeploy emits run:start, N step:* events, run:complete', async () => {
    const bus = new EventBus();
    const events: DeployEvent[] = [];
    bus.on((event) => events.push(event));

    const config = makeConfig({ eventBus: bus });
    const orchestrator = new DeployOrchestrator(config);
    await orchestrator.fullDeploy();

    // First event should be run:start
    expect(events[0]!.kind).toBe('run:start');
    // Last event should be run:complete
    expect(events[events.length - 1]!.kind).toBe('run:complete');

    // 6 steps = 6 step:start + 6 step:complete = 12 step events
    const stepEvents = events.filter((e) => e.kind.startsWith('step:'));
    expect(stepEvents).toHaveLength(12);

    const stepStarts = events.filter((e) => e.kind === 'step:start');
    const stepCompletes = events.filter((e) => e.kind === 'step:complete');
    expect(stepStarts).toHaveLength(6);
    expect(stepCompletes).toHaveLength(6);
  });

  it('events carry the correct runId', async () => {
    const bus = new EventBus();
    const events: DeployEvent[] = [];
    bus.on((event) => events.push(event));

    const config = makeConfig({ eventBus: bus });
    const orchestrator = new DeployOrchestrator(config);
    const report = await orchestrator.fullDeploy();

    // All events should share the same runId from the report
    for (const event of events) {
      expect(event.runId).toBe(report.runId);
    }
  });

  it('dryRun emits run:dry-run at end instead of run:complete', async () => {
    const bus = new EventBus();
    const events: DeployEvent[] = [];
    bus.on((event) => events.push(event));

    const config = makeConfig({ eventBus: bus });
    const orchestrator = new DeployOrchestrator(config);
    await orchestrator.fullDeploy({ dryRun: true });

    const lastEvent = events[events.length - 1]!;
    expect(lastEvent.kind).toBe('run:dry-run');

    // Should NOT have run:complete
    const completeEvents = events.filter((e) => e.kind === 'run:complete');
    expect(completeEvents).toHaveLength(0);
  });

  it('step events from a failed deploy include a step:fail event', async () => {
    const bus = new EventBus();
    const events: DeployEvent[] = [];
    bus.on((event) => events.push(event));

    const config = makeConfig({ eventBus: bus });
    // Make the 3rd step fail
    (config.steps[2].execute as ReturnType<typeof mock>).mockImplementation(
      () => Promise.reject(new Error('deploy error')),
    );

    const orchestrator = new DeployOrchestrator(config);
    await orchestrator.fullDeploy();

    const failEvents = events.filter((e) => e.kind === 'step:fail');
    expect(failEvents).toHaveLength(1);
    expect(failEvents[0]!.kind === 'step:fail' && failEvents[0]!.stepId).toBe('deployFunctions');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJsonlEntries(path: string): Promise<ActivityLogEntry[]> {
  try {
    const text = readFileSync(path, 'utf-8');
    return text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ActivityLogEntry);
  } catch {
    return [];
  }
}
