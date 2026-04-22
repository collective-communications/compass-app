import { join } from 'node:path';
import type { HealthAggregator } from '../core/health-aggregator.js';
import type { SecretsSyncEngine } from '../core/secrets-sync-engine.js';
import type { DeployOrchestrator } from '../core/deploy-orchestrator.js';
import type { PluginRegistry } from '../core/plugin-registry.js';
import type { VaultClient } from '../types/vault.js';
import { EventBus } from '../core/event-bus.js';
import { VaultLockedError } from '../core/secrets-sync-engine.js';
import { Router, jsonError } from './router.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSecretsRoutes } from './routes/secrets.js';
import { registerActivityRoutes } from './routes/activity.js';
import { registerEventRoutes } from './routes/events.js';
import { registerManifestRoutes } from './routes/manifest.js';
import { registerDeployRoutes } from './routes/deploy.js';
import { registerProviderRoutes } from './routes/providers.js';

export interface ServerConfig {
  port: number;
  uiDir: string;
  dashboardName: string;
  healthAggregator: HealthAggregator;
  syncEngine: SecretsSyncEngine;
  orchestrator: DeployOrchestrator;
  registry: PluginRegistry;
  vaultClient: VaultClient;
  /** Optional — a bus is created on demand so tests can omit it. */
  eventBus?: EventBus;
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

  const eventBus = config.eventBus ?? new EventBus();

  // Core routes
  registerHealthRoutes(router, config.healthAggregator);
  registerSecretsRoutes(router, config.syncEngine, config.vaultClient, config.registry);
  registerActivityRoutes(router, config.orchestrator);
  registerEventRoutes(router, eventBus);
  registerManifestRoutes(router, config.registry, config.dashboardName);
  registerDeployRoutes(router, config.orchestrator);
  registerProviderRoutes(router, config.registry);

  // Provider routes — each plugin registers its own
  const routeCtx = {
    vaultClient: config.vaultClient,
    syncEngine: config.syncEngine,
  };
  for (const plugin of config.registry.getAll()) {
    plugin.registerRoutes(router, routeCtx);
  }

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
