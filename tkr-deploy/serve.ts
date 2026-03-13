import { join } from 'node:path';
import { $ } from 'bun';
import config from './deploy.config.js';
import { VaultHttpClient } from './src/adapters/vault-client.js';
import { PluginRegistry } from './src/core/plugin-registry.js';
import { SecretsSyncEngine } from './src/core/secrets-sync-engine.js';
import { DeployOrchestrator } from './src/core/deploy-orchestrator.js';
import { HealthAggregator } from './src/core/health-aggregator.js';
import { createServer } from './src/api/server.js';

// ---------------------------------------------------------------------------
// 0. Build UI (TypeScript → browser JS)
// ---------------------------------------------------------------------------

await $`bun run ${join(import.meta.dir, 'build-ui.ts')}`.quiet();

// ---------------------------------------------------------------------------
// 1. Load config
// ---------------------------------------------------------------------------

const port = Number(process.env.DEPLOY_PORT ?? config.port ?? 42043);
const vaultUrl = process.env.VAULT_URL ?? config.vault.url;
const vaultName = process.env.VAULT_NAME ?? config.vault.vaultName;
const dashboardName = config.name ?? 'tkr-deploy';

// ---------------------------------------------------------------------------
// 2. Create VaultClient and probe connectivity
// ---------------------------------------------------------------------------

const vaultClient = new VaultHttpClient({ baseUrl: vaultUrl, vaultName });

let vaultSecrets: Map<string, string> = new Map();

try {
  const health = await vaultClient.health();
  if (health.connected && !health.locked) {
    console.log(`[tkr-deploy] vault connected (${vaultName})`);
    try {
      vaultSecrets = await vaultClient.getAll();
      console.log(`[tkr-deploy] loaded ${vaultSecrets.size} secrets from vault`);
    } catch (err) {
      console.warn(`[tkr-deploy] failed to read vault secrets: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    const reason = !health.connected ? 'offline' : 'locked';
    console.warn(`[tkr-deploy] vault ${reason} — starting in degraded mode`);
  }
} catch (err) {
  console.warn(`[tkr-deploy] vault unreachable — starting in degraded mode: ${err instanceof Error ? err.message : String(err)}`);
}

// ---------------------------------------------------------------------------
// 3. Initialize plugins from config
// ---------------------------------------------------------------------------

const registry = new PluginRegistry();
const factoryCtx = {
  secrets: vaultSecrets,
  vaultClient,
  getSecret: (name: string) => vaultClient.getSecret(name),
};

for (const factory of config.providers) {
  const plugin = factory(factoryCtx);
  registry.register(plugin);
  console.log(`[tkr-deploy] loaded provider: ${plugin.displayName}`);
}

// ---------------------------------------------------------------------------
// 4. Build domain services from registry
// ---------------------------------------------------------------------------

const syncEngine = new SecretsSyncEngine({
  vaultClient,
  targets: registry.allSyncTargets(),
  mappings: registry.allSecretMappings(),
});

// Core deploy steps: syncSecrets (order 0) and healthCheck (order 900)
const coreSteps = [
  {
    id: 'syncSecrets',
    label: 'Sync secrets to providers',
    provider: 'vault',
    order: 0,
    execute: async () => {
      const report = await syncEngine.syncAll();
      return `Synced ${report.synced} secrets, ${report.failed} failed`;
    },
  },
  {
    id: 'healthCheck',
    label: 'Health check all providers',
    provider: 'all',
    order: 900,
    execute: async () => {
      const adapters = registry.allAdapters();
      const results = await Promise.all(adapters.map((a) => a.healthCheck()));
      const issues = results.filter((r) => r.status !== 'healthy');
      if (issues.length > 0) {
        throw new Error(`Health check failed: ${issues.map((i) => `${i.provider}: ${i.status}`).join(', ')}`);
      }
      return 'All providers healthy';
    },
  },
];

const allSteps = [...coreSteps, ...registry.allDeploySteps()].sort((a, b) => a.order - b.order);

const orchestrator = new DeployOrchestrator({
  vaultClient,
  steps: allSteps,
});

const healthAggregator = new HealthAggregator({
  adapters: registry.allAdapters(),
  vaultClient,
});

// ---------------------------------------------------------------------------
// 5. Create and start HTTP server
// ---------------------------------------------------------------------------

const uiDir = join(import.meta.dir, 'ui');

const server = createServer({
  port,
  uiDir,
  dashboardName,
  healthAggregator,
  syncEngine,
  orchestrator,
  registry,
  vaultClient,
});

console.log(`[tkr-deploy] listening on http://localhost:${server.port}`);

// ---------------------------------------------------------------------------
// 6. Start health polling
// ---------------------------------------------------------------------------

healthAggregator.start();

// ---------------------------------------------------------------------------
// 7. Shutdown handlers
// ---------------------------------------------------------------------------

function shutdown(): void {
  console.log('[tkr-deploy] shutting down...');
  healthAggregator.stop();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
