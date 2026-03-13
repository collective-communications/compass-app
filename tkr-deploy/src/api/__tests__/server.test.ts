import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../server.js';
import type { HealthSnapshot, HealthAggregator } from '../../core/health-aggregator.js';
import type { SecretsSyncEngine } from '../../core/secrets-sync-engine.js';
import type { DeployOrchestrator } from '../../core/deploy-orchestrator.js';
import { PluginRegistry } from '../../core/plugin-registry.js';
import type { ProviderPlugin, PluginRouteContext } from '../../types/plugin.js';
import type { VaultClient } from '../../types/vault.js';
import { Router, jsonSuccess } from '../router.js';

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
      errors: [],
    }),
    syncSecret: async () => [{ target: 'vercel', success: true }],
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

function mockVaultClient(): VaultClient {
  return {
    health: async () => ({ connected: true, locked: false, name: 'test-vault' }),
    listSecrets: async () => ['SUPABASE_URL'],
    getSecret: async () => 'test-value',
    getAll: async () => new Map([['SUPABASE_URL', 'test-value']]),
    getStatus: async () => ({ connected: true, locked: false, name: 'test-vault', secretCount: 1 }),
  };
}

/** Create mock plugins that register the provider routes the tests expect. */
function createMockRegistry(): PluginRegistry {
  const registry = new PluginRegistry();

  const supabasePlugin: ProviderPlugin = {
    id: 'supabase',
    displayName: 'Supabase',
    adapter: {
      name: 'supabase',
      healthCheck: async () => ({ provider: 'supabase', status: 'healthy', label: 'Supabase', details: {}, checkedAt: Date.now() }),
    },
    secretMappings: [],
    syncTarget: { verifiable: false, setSecret: async () => {} },
    deploySteps: [],
    screen: { label: 'Database', path: '/database', modulePath: 'screens/database.js' },
    registerRoutes(router: Router) {
      router.get('/api/database/migrations', async () => {
        return jsonSuccess([
          { filename: '001_init.sql', status: 'applied', appliedAt: '2026-01-01T00:00:00Z' },
        ]);
      });
    },
  };

  const vercelPlugin: ProviderPlugin = {
    id: 'vercel',
    displayName: 'Vercel',
    adapter: {
      name: 'vercel',
      healthCheck: async () => ({ provider: 'vercel', status: 'healthy', label: 'Vercel', details: {}, checkedAt: Date.now() }),
    },
    secretMappings: [],
    deploySteps: [],
    screen: { label: 'Frontend', path: '/frontend', modulePath: 'screens/frontend.js' },
    registerRoutes(router: Router) {
      router.post('/api/frontend/redeploy', async () => {
        return jsonSuccess({ uid: 'dpl_2' });
      });
    },
  };

  const githubPlugin: ProviderPlugin = {
    id: 'github',
    displayName: 'GitHub',
    adapter: {
      name: 'github',
      healthCheck: async () => ({ provider: 'github', status: 'healthy', label: 'GitHub', details: {}, checkedAt: Date.now() }),
    },
    secretMappings: [],
    deploySteps: [],
    screen: { label: 'CI/CD', path: '/cicd', modulePath: 'screens/cicd.js' },
    registerRoutes(router: Router) {
      router.get('/api/cicd/workflows', async () => {
        return jsonSuccess([
          { id: 1, name: 'CI', filename: 'ci.yml', state: 'active', lastRun: null },
        ]);
      });
    },
  };

  const resendPlugin: ProviderPlugin = {
    id: 'resend',
    displayName: 'Resend',
    adapter: {
      name: 'resend',
      healthCheck: async () => ({ provider: 'resend', status: 'healthy', label: 'Resend', details: {}, checkedAt: Date.now() }),
    },
    secretMappings: [],
    deploySteps: [],
    screen: { label: 'Email', path: '/email', modulePath: 'screens/email.js' },
    registerRoutes() {},
  };

  registry.register(supabasePlugin);
  registry.register(vercelPlugin);
  registry.register(githubPlugin);
  registry.register(resendPlugin);

  return registry;
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
      dashboardName: 'tkr-deploy',
      healthAggregator: mockHealthAggregator(),
      syncEngine: mockSyncEngine(),
      orchestrator: mockOrchestrator(),
      registry: createMockRegistry(),
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

  // --- Secrets ---

  test('GET /api/secrets returns sync rows', async () => {
    const res = await fetch(`${baseUrl}/api/secrets`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.secrets[0].name).toBe('SUPABASE_URL');
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
    expect(body.data.entries[0].action).toBe('pushMigrations');
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
