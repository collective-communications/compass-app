import type { SupabaseAdapter } from '../../adapters/supabase-adapter.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerDatabaseRoutes(
  router: Router,
  supabase: SupabaseAdapter,
): void {
  router.get('/api/database/health', async () => {
    const health = await supabase.healthCheck();
    return jsonSuccess(health);
  });

  router.get('/api/database/migrations', async () => {
    const migrations = await supabase.getMigrations();
    return jsonSuccess(migrations);
  });

  router.post('/api/database/migrations/push', async () => {
    const result = await supabase.pushMigrations();
    return jsonSuccess(result);
  });

  router.get('/api/database/functions', async () => {
    const functions = await supabase.getEdgeFunctions();
    return jsonSuccess(functions);
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

  router.get('/api/database/extensions', async () => {
    const status = await supabase.getExtensionStatus('vector');
    return jsonSuccess(status);
  });

  router.post('/api/database/extensions/:name/enable', async (_req, params) => {
    await supabase.enableExtension(params.name);
    return jsonSuccess({ enabled: params.name });
  });
}
