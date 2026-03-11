import { join } from 'node:path';
import { $ } from 'bun';
import { VaultHttpClient } from './src/adapters/vault-client.js';
import { SupabaseAdapter } from './src/adapters/supabase-adapter.js';
import { VercelAdapter } from './src/adapters/vercel-adapter.js';
import { ResendAdapter } from './src/adapters/resend-adapter.js';
import { GitHubAdapter } from './src/adapters/github-adapter.js';
import { SecretsSyncEngine } from './src/domain/secrets-sync-engine.js';
import { DeployOrchestrator } from './src/domain/deploy-orchestrator.js';
import { HealthAggregator } from './src/domain/health-aggregator.js';
import { createServer } from './src/api/server.js';

// ---------------------------------------------------------------------------
// 0. Build UI (TypeScript → browser JS)
// ---------------------------------------------------------------------------

await $`bun run ${join(import.meta.dir, 'build-ui.ts')}`.quiet();

// ---------------------------------------------------------------------------
// 1. Load env config
// ---------------------------------------------------------------------------

const port = Number(process.env.DEPLOY_PORT ?? 42043);
const vaultUrl = process.env.VAULT_URL ?? 'http://localhost:42042';
const vaultName = process.env.VAULT_NAME ?? 'compass';
// These are overridden by vault values after vault loads (see below)

// ---------------------------------------------------------------------------
// 2. Create VaultClient and probe connectivity
// ---------------------------------------------------------------------------

const vaultClient = new VaultHttpClient({ baseUrl: vaultUrl, vaultName });

let vaultConnected = false;
let vaultSecrets: Map<string, string> = new Map();

try {
  const health = await vaultClient.health();
  if (health.connected && !health.locked) {
    vaultConnected = true;
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
// 3. Read secrets (fall back to empty strings when vault unavailable)
// ---------------------------------------------------------------------------

function secret(name: string): string {
  return vaultSecrets.get(name) ?? '';
}

const supabaseAccessToken = secret('SUPABASE_ACCESS_TOKEN');
const supabaseProjectRef = secret('SUPABASE_PROJECT_REF')
  || secret('SUPABASE_URL').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  || '';
const vercelToken = secret('VERCEL_TOKEN');
const vercelProjectId = secret('VERCEL_PROJECT_ID');
const vercelOrgId = secret('VERCEL_ORG_ID') || undefined;
const resendApiKey = secret('RESEND_CCC_ADMIN');
const githubToken = secret('GITHUB_TOKEN');
const githubOwner = secret('GITHUB_OWNER');
const githubRepo = secret('GITHUB_REPO');

// ---------------------------------------------------------------------------
// 4. Create adapters
// ---------------------------------------------------------------------------

const supabase = new SupabaseAdapter({
  projectRef: supabaseProjectRef,
  accessToken: supabaseAccessToken,
  serviceRoleKey: secret('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseUrl: secret('SUPABASE_URL'),
  projectRoot: join(import.meta.dir, '..'),
});

const vercel = new VercelAdapter({
  token: vercelToken,
  projectId: vercelProjectId,
  orgId: vercelOrgId,
});

const resend = new ResendAdapter({
  apiKey: resendApiKey,
});

const github = new GitHubAdapter({
  token: githubToken,
  owner: githubOwner,
  repo: githubRepo,
});

// ---------------------------------------------------------------------------
// 5. Create domain services
// ---------------------------------------------------------------------------

const syncEngine = new SecretsSyncEngine({
  vaultClient,
  adapters: { supabase, vercel, github },
});

const orchestrator = new DeployOrchestrator({
  supabase,
  vercel,
  vaultClient,
  syncEngine: {
    async syncAll() {
      const report = await syncEngine.syncAll();
      const errors: string[] = [];
      for (const row of report.rows) {
        for (const result of row.results) {
          if (!result.success && result.error) {
            errors.push(`${row.name}→${result.target}: ${result.error}`);
          }
        }
      }
      return { synced: report.synced, failed: report.failed, errors };
    },
  },
});

const healthAggregator = new HealthAggregator({
  adapters: [supabase, vercel, resend, github],
  vaultClient,
});

// ---------------------------------------------------------------------------
// 6. Create and start HTTP server
// ---------------------------------------------------------------------------

const uiDir = join(import.meta.dir, 'ui');

const server = createServer({
  port,
  uiDir,
  healthAggregator,
  syncEngine,
  orchestrator,
  adapters: { supabase, vercel, github, resend },
  vaultClient,
});

console.log(`[tkr-deploy] listening on http://localhost:${server.port}`);

// ---------------------------------------------------------------------------
// 7. Start health polling
// ---------------------------------------------------------------------------

healthAggregator.start();

// ---------------------------------------------------------------------------
// 8. Shutdown handlers
// ---------------------------------------------------------------------------

function shutdown(): void {
  console.log('[tkr-deploy] shutting down...');
  healthAggregator.stop();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
