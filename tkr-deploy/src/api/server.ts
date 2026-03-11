import { join } from 'node:path';
import type { HealthAggregator } from '../domain/health-aggregator.js';
import type { SecretsSyncEngine } from '../domain/secrets-sync-engine.js';
import type { DeployOrchestrator } from '../domain/deploy-orchestrator.js';
import type { SupabaseAdapter } from '../adapters/supabase-adapter.js';
import type { VercelAdapter } from '../adapters/vercel-adapter.js';
import type { GitHubAdapter } from '../adapters/github-adapter.js';
import type { ResendAdapter } from '../adapters/resend-adapter.js';
import type { VaultClient } from '../types/vault.js';
import { VaultLockedError } from '../domain/secrets-sync-engine.js';
import { Router, jsonError } from './router.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSecretsRoutes } from './routes/secrets.js';
import { registerDatabaseRoutes } from './routes/database.js';
import { registerFrontendRoutes } from './routes/frontend.js';
import { registerEmailRoutes } from './routes/email.js';
import { registerCicdRoutes } from './routes/cicd.js';
import { registerActivityRoutes } from './routes/activity.js';
import { registerEventRoutes } from './routes/events.js';

export interface ServerConfig {
  port: number;
  uiDir: string;
  healthAggregator: HealthAggregator;
  syncEngine: SecretsSyncEngine;
  orchestrator: DeployOrchestrator;
  adapters: {
    supabase: SupabaseAdapter;
    vercel: VercelAdapter;
    github: GitHubAdapter;
    resend: ResendAdapter;
  };
  vaultClient: VaultClient;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export function createServer(config: ServerConfig): ReturnType<typeof Bun.serve> {
  const router = new Router();

  // Register all API routes
  registerHealthRoutes(router, config.healthAggregator);
  registerSecretsRoutes(router, config.syncEngine, config.vaultClient);
  registerDatabaseRoutes(router, config.adapters.supabase);
  registerFrontendRoutes(router, config.adapters.vercel, config.syncEngine);
  registerEmailRoutes(router, config.adapters.resend);
  registerCicdRoutes(router, config.adapters.github, config.syncEngine, config.vaultClient);
  registerActivityRoutes(router, config.orchestrator);
  registerEventRoutes(router);

  return Bun.serve({
    port: config.port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // API routes
      if (url.pathname.startsWith('/api')) {
        const match = router.match(req);
        if (!match) {
          return jsonError('Not found', 404);
        }

        try {
          return await match.handler(req, match.params);
        } catch (err) {
          if (err instanceof VaultLockedError) {
            return jsonError('Vault is locked', 503);
          }
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[api] ${req.method} ${url.pathname} error:`, message);
          return jsonError(message, 500);
        }
      }

      // Static file serving
      return await serveStatic(config.uiDir, url.pathname);
    },
  });
}

async function serveStatic(uiDir: string, pathname: string): Promise<Response> {
  // Try exact file first
  let filePath = join(uiDir, pathname);
  let file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file, {
      headers: { 'Content-Type': getMimeType(filePath) },
    });
  }

  // SPA fallback — serve index.html for unknown paths
  filePath = join(uiDir, 'index.html');
  file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return jsonError('Not found', 404);
}
