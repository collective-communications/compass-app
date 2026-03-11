import { describe, it, expect } from 'bun:test';
import { MockVaultClient } from '../helpers/mock-vault-client.js';
import { createMockSupabaseAdapter, createMockVercelAdapter } from '../helpers/mock-adapters.js';
import { createDeploymentEntry } from '../helpers/factories.js';
import { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import { DeployOrchestrator } from '../../domain/deploy-orchestrator.js';
import type { DeployStepState, StepResult } from '../../domain/deploy-orchestrator.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function buildStack() {
  const vault = new MockVaultClient({
    secrets: {
      RESEND_API_KEY: 're_test_key_123',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-abc',
      VERCEL_TOKEN: 'tok_vercel_xyz',
    },
  });

  const supabase = createMockSupabaseAdapter({
    pushMigrations: async () => ({ applied: ['001_init.sql'], errors: [] }),
    deployAllFunctions: async () => ({ deployed: ['send-report-email'], failed: [] }),
  });

  const vercel = createMockVercelAdapter({
    getCurrentDeployment: async () => createDeploymentEntry({ uid: 'dpl_current' }),
    triggerRedeploy: async () => 'dpl_new_456',
    pollDeployment: async () => createDeploymentEntry({ uid: 'dpl_new_456', status: 'READY' }),
  });

  const github = {
    setSecret: async () => {},
    listSecrets: async () => [] as string[],
  };

  const syncEngine = new SecretsSyncEngine({
    vaultClient: vault,
    adapters: {
      supabase,
      vercel,
      github,
    },
  });

  const activityLogPath = join(tmpdir(), `tkr-deploy-test-${Date.now()}.jsonl`);

  const orchestrator = new DeployOrchestrator({
    supabase,
    vercel,
    vaultClient: vault,
    syncEngine,
    pollIntervalMs: 0,
    buildTimeoutMs: 5000,
    activityLogPath,
  });

  return { vault, supabase, vercel, syncEngine, orchestrator, activityLogPath };
}

describe('integration: fullDeploy', () => {
  it('completes all 6 steps successfully', async () => {
    const { orchestrator } = buildStack();
    const report = await orchestrator.fullDeploy();

    expect(report.status).toBe('success');
    expect(report.steps).toHaveLength(6);
    for (const step of report.steps) {
      expect(step.status).toBe('success');
    }
    expect(report.failedAtStep).toBeUndefined();
    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('writes activity log entries for each step', async () => {
    const { orchestrator, activityLogPath } = buildStack();
    await orchestrator.fullDeploy();

    const log = await orchestrator.getActivityLog(10);
    expect(log.length).toBeGreaterThanOrEqual(6);
    for (const entry of log) {
      expect(entry.status).toBe('success');
    }
  });

  it('fires progress callbacks for each step', async () => {
    const { orchestrator } = buildStack();
    const started: string[] = [];
    const completed: string[] = [];

    await orchestrator.fullDeploy({
      onStepStart: (step: DeployStepState) => started.push(step.id),
      onStepComplete: (_step: DeployStepState, result: StepResult) => completed.push(result.stepId),
    });

    expect(started).toHaveLength(6);
    expect(completed).toHaveLength(6);
  });

  it('halts on migration failure and reports partial status', async () => {
    const { orchestrator } = buildStack();
    // Override supabase to fail on pushMigrations
    (orchestrator as any).config.supabase.pushMigrations = async () => ({
      applied: [],
      errors: ['syntax error at line 42'],
    });

    const report = await orchestrator.fullDeploy();

    expect(report.status).toBe('partial');
    expect(report.failedAtStep).toBe('pushMigrations');
    // syncSecrets succeeded, pushMigrations failed, rest skipped
    expect(report.steps.length).toBe(2);
    expect(report.steps[0].status).toBe('success');
    expect(report.steps[1].status).toBe('failed');
  });

  it('rejects when vault is locked', async () => {
    const { orchestrator, vault } = buildStack();
    vault.lock();

    await expect(orchestrator.fullDeploy()).rejects.toThrow('Vault is locked');
  });

  it('prevents concurrent deploys', async () => {
    const { orchestrator } = buildStack();

    // Make syncAll slow so the deploy is still running when we try the second
    (orchestrator as any).config.syncEngine.syncAll = async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { synced: 0, failed: 0, errors: [] };
    };

    const first = orchestrator.fullDeploy();
    // Wait a tick so the first deploy enters running state
    await new Promise((r) => setTimeout(r, 10));
    await expect(orchestrator.fullDeploy()).rejects.toThrow('already in progress');
    await first;
  });
});
