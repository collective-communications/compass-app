import { describe, it, expect } from 'bun:test';
import { MockVaultClient } from '../helpers/mock-vault-client.js';
import { DeployOrchestrator } from '../../core/deploy-orchestrator.js';
import type { DeployStepState, StepResult } from '../../core/deploy-orchestrator.js';
import type { PluginDeployStep } from '../../types/plugin.js';
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

  const activityLogPath = join(tmpdir(), `tkr-deploy-test-${Date.now()}.jsonl`);

  const steps: PluginDeployStep[] = [
    {
      id: 'syncSecrets',
      label: 'Sync secrets',
      provider: 'core',
      order: 0,
      execute: async () => 'Synced 3 secrets',
    },
    {
      id: 'pushMigrations',
      label: 'Push database migrations',
      provider: 'supabase',
      order: 100,
      execute: async () => 'Applied 1 migration(s)',
    },
    {
      id: 'deployFunctions',
      label: 'Deploy edge functions',
      provider: 'supabase',
      order: 200,
      execute: async () => 'Deployed 1 function(s)',
    },
    {
      id: 'triggerRedeploy',
      label: 'Trigger redeploy',
      provider: 'vercel',
      order: 300,
      execute: async () => 'Triggered redeploy dpl_new_456',
    },
    {
      id: 'waitForBuild',
      label: 'Wait for build',
      provider: 'vercel',
      order: 400,
      execute: async () => 'Build complete',
    },
    {
      id: 'healthCheck',
      label: 'Health check',
      provider: 'core',
      order: 900,
      execute: async () => 'All providers healthy',
    },
  ];

  const orchestrator = new DeployOrchestrator({
    vaultClient: vault,
    steps,
    activityLogPath,
  });

  return { vault, steps, orchestrator, activityLogPath };
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
    const { orchestrator } = buildStack();
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
    // Override pushMigrations step to fail
    (orchestrator as any).config.steps[1] = {
      id: 'pushMigrations',
      label: 'Push database migrations',
      provider: 'supabase',
      order: 100,
      execute: async () => { throw new Error('syntax error at line 42'); },
    };

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

    // Make first step slow so the deploy is still running when we try the second
    (orchestrator as any).config.steps[0] = {
      id: 'syncSecrets',
      label: 'Sync secrets',
      provider: 'core',
      order: 0,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 'Synced';
      },
    };

    const first = orchestrator.fullDeploy();
    // Wait a tick so the first deploy enters running state
    await new Promise((r) => setTimeout(r, 10));
    await expect(orchestrator.fullDeploy()).rejects.toThrow('already in progress');
    await first;
  });
});
