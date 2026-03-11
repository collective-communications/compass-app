import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../server.js';
import type { HealthSnapshot, HealthAggregator } from '../../domain/health-aggregator.js';
import type { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import type { DeployOrchestrator } from '../../domain/deploy-orchestrator.js';
import type { SupabaseAdapter } from '../../adapters/supabase-adapter.js';
import type { VercelAdapter } from '../../adapters/vercel-adapter.js';
import type { GitHubAdapter } from '../../adapters/github-adapter.js';
import type { ResendAdapter } from '../../adapters/resend-adapter.js';
import type { VaultClient } from '../../types/vault.js';

// --- Mock factories ---

function mockHealthAggregator(): HealthAggregator {
  const snapshot: HealthSnapshot = {
    providers: [
      { provider: 'supabase', status: 'healthy', latencyMs: 42, label: 'Supabase', checkedAt: '2026-01-01T00:00:00Z' },
      { provider: 'vercel', status: 'healthy', latencyMs: 31, label: 'Vercel', checkedAt: '2026-01-01T00:00:00Z' },
    ],
    rollup: 'healthy',
    checkedAt: '2026-01-01T00:00:00Z',
  };

  return {
    getLastResult: () => snapshot,
    checkAll: async () => snapshot,
    start: () => {},
    stop: () => {},
    get isPolling() { return false; },
  } as unknown as HealthAggregator;
}

function mockSyncEngine(): SecretsSyncEngine {
  return {
    computeSyncStatus: async () => [
      {
        name: 'SUPABASE_URL',
        vaultValueHash: 'abc123',
        targets: {
          supabase: { state: 'na' },
          vercel: { state: 'synced', valueHash: 'abc123' },
          github: { state: 'synced' },
        },
      },
    ],
    syncAll: async () => ({
      total: 1,
      synced: 1,
      failed: 0,
      skipped: 0,
      rows: [],
    }),
    syncSecret: async () => [{ target: 'vercel' as const, success: true }],
  } as unknown as SecretsSyncEngine;
}

function mockOrchestrator(): DeployOrchestrator {
  return {
    getActivityLog: async () => [
      {
        timestamp: '2026-01-01T00:00:00Z',
        action: 'pushMigrations',
        provider: 'supabase',
        status: 'success',
        durationMs: 1200,
      },
    ],
    get isRunning() { return false; },
  } as unknown as DeployOrchestrator;
}

function mockSupabase(): SupabaseAdapter {
  return {
    name: 'supabase',
    getMigrations: async () => [
      { filename: '001_init.sql', status: 'applied', appliedAt: '2026-01-01T00:00:00Z' },
    ],
    pushMigrations: async () => ({ applied: ['002_add.sql'], errors: [] }),
    getEdgeFunctions: async () => [
      { name: 'send-email', deployed: true, lastDeployed: '2026-01-01T00:00:00Z', requiredSecrets: [] },
    ],
    deployFunction: async () => {},
    deployAllFunctions: async () => ({ deployed: ['send-email'], failed: [] }),
    getExtensionStatus: async () => ({ installed: true, version: '0.7.0' }),
    enableExtension: async () => {},
    healthCheck: async () => ({ provider: 'supabase', status: 'healthy', label: 'Supabase', checkedAt: Date.now() }),
    setSecrets: async () => {},
  } as unknown as SupabaseAdapter;
}

function mockVercel(): VercelAdapter {
  return {
    name: 'vercel',
    getProject: async () => ({ name: 'compass-app', framework: 'vite', alias: [] }),
    getDeployments: async () => [
      { uid: 'dpl_1', commitSha: 'abc', commitMessage: 'init', branch: 'main', target: 'production', status: 'READY', duration: 60, createdAt: '2026-01-01T00:00:00Z' },
    ],
    getCurrentDeployment: async () => ({
      uid: 'dpl_1', commitSha: 'abc', commitMessage: 'init', branch: 'main', target: 'production', status: 'READY', duration: 60, createdAt: '2026-01-01T00:00:00Z',
    }),
    triggerRedeploy: async () => 'dpl_2',
    promoteDeployment: async () => {},
    getEnvVars: async () => [],
    setEnvVar: async () => {},
    healthCheck: async () => ({ provider: 'vercel', status: 'healthy', label: 'Vercel', checkedAt: Date.now() }),
  } as unknown as VercelAdapter;
}

function mockGitHub(): GitHubAdapter {
  return {
    name: 'github',
    getWorkflows: async () => [
      { id: 1, name: 'CI', filename: 'ci.yml', state: 'active', lastRun: null },
    ],
    getRecentRuns: async () => [],
    listSecrets: async () => ['SUPABASE_URL'],
    setSecret: async () => {},
    createFile: async () => {},
    healthCheck: async () => ({ provider: 'github', status: 'healthy', label: 'GitHub', checkedAt: Date.now() }),
  } as unknown as GitHubAdapter;
}

function mockResend(): ResendAdapter {
  return {
    name: 'resend',
    getDomains: async () => [{ id: 'dom_1', name: 'example.com', status: 'verified' }],
    verifyDomain: async () => {},
    getSendingStats: async () => ({ sent: 10, limit: 3000, remaining: 2990 }),
    getApiKeys: async () => [{ id: 'key_1', name: 'Production', createdAt: '2026-01-01T00:00:00Z', permission: 'full_access', domainId: null }],
    healthCheck: async () => ({ provider: 'resend', status: 'healthy', label: 'Resend', checkedAt: Date.now() }),
  } as unknown as ResendAdapter;
}

function mockVaultClient(): VaultClient {
  return {
    health: async () => ({ connected: true, locked: false, name: 'test-vault' }),
    listSecrets: async () => ['SUPABASE_URL'],
    getSecret: async () => 'test-value',
    getAll: async () => new Map([['SUPABASE_URL', 'test-value']]),
    getStatus: async () => ({ connected: true, locked: false, name: 'test-vault', secretCount: 1 }),
  };
}

// --- Test suite ---

describe('API Server', () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(() => {
    // Create temp directory with test HTML
    tmpDir = mkdtempSync(join(tmpdir(), 'tkr-deploy-test-'));
    writeFileSync(join(tmpDir, 'index.html'), '<html><body>Deploy Dashboard</body></html>');
    writeFileSync(join(tmpDir, 'style.css'), 'body { margin: 0; }');

    server = createServer({
      port: 0, // Random port
      uiDir: tmpDir,
      healthAggregator: mockHealthAggregator(),
      syncEngine: mockSyncEngine(),
      orchestrator: mockOrchestrator(),
      adapters: {
        supabase: mockSupabase(),
        vercel: mockVercel(),
        github: mockGitHub(),
        resend: mockResend(),
      },
      vaultClient: mockVaultClient(),
    });

    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Health ---

  test('GET /api/health returns rollup', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.rollup).toBe('healthy');
    expect(body.data.providers).toHaveLength(2);
  });

  test('GET /api/providers returns array', async () => {
    const res = await fetch(`${baseUrl}/api/providers`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].provider).toBe('supabase');
  });

  // --- Secrets ---

  test('GET /api/secrets returns sync rows', async () => {
    const res = await fetch(`${baseUrl}/api/secrets`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].name).toBe('SUPABASE_URL');
  });

  test('POST /api/secrets/sync calls syncAll', async () => {
    const res = await fetch(`${baseUrl}/api/secrets/sync`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.synced).toBe(1);
  });

  // --- Database ---

  test('GET /api/database/migrations returns list', async () => {
    const res = await fetch(`${baseUrl}/api/database/migrations`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].filename).toBe('001_init.sql');
  });

  // --- Frontend ---

  test('POST /api/frontend/redeploy returns deployment', async () => {
    const res = await fetch(`${baseUrl}/api/frontend/redeploy`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.uid).toBe('dpl_2');
  });

  // --- CI/CD ---

  test('GET /api/cicd/workflows returns workflows', async () => {
    const res = await fetch(`${baseUrl}/api/cicd/workflows`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].name).toBe('CI');
  });

  // --- Activity ---

  test('GET /api/activity returns entries', async () => {
    const res = await fetch(`${baseUrl}/api/activity`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].action).toBe('pushMigrations');
  });

  // --- 404 ---

  test('unknown API route returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // --- Static files ---

  test('serves static index.html', async () => {
    const res = await fetch(`${baseUrl}/index.html`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html');
    const text = await res.text();
    expect(text).toContain('Deploy Dashboard');
  });

  test('serves static CSS file', async () => {
    const res = await fetch(`${baseUrl}/style.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/css');
  });

  test('SPA fallback serves index.html for unknown paths', async () => {
    const res = await fetch(`${baseUrl}/some/unknown/path`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html');
    const text = await res.text();
    expect(text).toContain('Deploy Dashboard');
  });
});
