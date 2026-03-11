import type { SupabaseAdapter } from '../../adapters/supabase-adapter.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerDatabaseRoutes(
  router: Router,
  supabase: SupabaseAdapter,
): void {
  router.get('/api/database/health', async () => {
    const health = await supabase.healthCheck();
    const details = health.details as Record<string, string> | undefined;
    return jsonSuccess({
      status: health.status === 'healthy' ? 'connected' : 'disconnected',
      projectRef: details?.projectRef ?? '',
      region: details?.region ?? 'unknown',
      version: details?.version ?? 'unknown',
    });
  });

  router.get('/api/database/migrations', async () => {
    const migrations = await supabase.getMigrations();
    // Normalize MigrationEntry[] → UI MigrationsData shape
    const applied = migrations.filter((m) => m.status === 'applied').length;
    return jsonSuccess({
      applied,
      total: migrations.length,
      migrations: migrations.map((m) => ({
        name: m.filename,
        applied: m.status === 'applied',
      })),
    });
  });

  router.post('/api/database/migrations/push', async () => {
    const result = await supabase.pushMigrations();
    return jsonSuccess(result);
  });

  router.get('/api/database/functions', async () => {
    const functions = await supabase.getEdgeFunctions();
    // Normalize EdgeFunction[] → UI FunctionsData shape
    const deployed = functions.filter((f) => f.deployed).length;
    return jsonSuccess({
      deployed,
      total: functions.length,
      functions: functions.map((f) => ({
        name: f.name,
        deployed: f.deployed,
        missingSecrets: f.requiredSecrets ?? [],
      })),
    });
  });

  router.post('/api/database/functions/deploy', async (req) => {
    let body: { name?: string } | undefined;
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    if (body?.name) {
      await supabase.deployFunction(body.name);
      return jsonSuccess({ deployed: body.name });
    }

    const result = await supabase.deployAllFunctions();
    return jsonSuccess(result);
  });

  router.post('/api/database/functions/:name/deploy', async (_req, params) => {
    await supabase.deployFunction(params.name);
    return jsonSuccess({ deployed: params.name });
  });

  router.post('/api/database/functions/deploy-all', async () => {
    const result = await supabase.deployAllFunctions();
    return jsonSuccess(result);
  });

  router.get('/api/database/extensions', async () => {
    const status = await supabase.getExtensionStatus('vector');
    // Normalize { installed, version } → UI ExtensionData shape
    return jsonSuccess({
      pgvector: status.installed ? 'enabled' : 'available',
    });
  });

  router.post('/api/database/extensions/:name/enable', async (_req, params) => {
    // UI uses "pgvector" but the Postgres extension name is "vector"
    const extName = params.name === 'pgvector' ? 'vector' : params.name;
    await supabase.enableExtension(extName);
    return jsonSuccess({ enabled: params.name });
  });
}
