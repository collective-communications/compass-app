import type { SupabaseAdapter } from './adapter.js';
import type { Router } from '../../src/api/router.js';
import { jsonSuccess, jsonError } from '../../src/api/router.js';

export function registerDatabaseRoutes(
  router: Router,
  supabase: SupabaseAdapter,
): void {
  router.get('/api/database/health', async () => {
    try {
      const health = await supabase.healthCheck();
      const details = health.details as Record<string, string> | undefined;
      return jsonSuccess({
        status: health.status === 'healthy' ? 'connected' : 'disconnected',
        projectRef: details?.projectRef ?? '',
        region: details?.region ?? 'unknown',
        version: details?.version ?? 'unknown',
      });
    } catch {
      return jsonSuccess({
        status: 'disconnected',
        projectRef: '',
        region: 'unknown',
        version: 'unknown',
        error: 'Supabase API unavailable — check vault/token',
      });
    }
  });

  router.get('/api/database/migrations', async () => {
    try {
      const migrations = await supabase.getMigrations();
      const applied = migrations.filter((m) => m.status === 'applied').length;
      return jsonSuccess({
        applied,
        total: migrations.length,
        migrations: migrations.map((m) => ({
          name: m.filename,
          applied: m.status === 'applied',
        })),
      });
    } catch {
      return jsonSuccess({
        applied: 0,
        total: 0,
        migrations: [],
        error: 'Supabase API unavailable — check vault/token',
      });
    }
  });

  router.post('/api/database/migrations/push', async () => {
    const result = await supabase.pushMigrations();
    return jsonSuccess(result);
  });

  router.get('/api/database/functions', async () => {
    try {
      const functions = await supabase.getEdgeFunctions();
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
    } catch {
      return jsonSuccess({
        deployed: 0,
        total: 0,
        functions: [],
        error: 'Supabase API unavailable — check vault/token',
      });
    }
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
    try {
      const status = await supabase.getExtensionStatus('vector');
      return jsonSuccess({
        pgvector: status.installed ? 'enabled' : 'available',
      });
    } catch {
      return jsonSuccess({
        pgvector: 'unknown',
        error: 'Supabase API unavailable — check vault/token',
      });
    }
  });

  router.post('/api/database/extensions/:name/enable', async (_req, params) => {
    // UI uses "pgvector" but the Postgres extension name is "vector"
    const extName = params.name === 'pgvector' ? 'vector' : params.name;
    await supabase.enableExtension(extName);
    return jsonSuccess({ enabled: params.name });
  });
}
