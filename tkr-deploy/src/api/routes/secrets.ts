import type { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerSecretsRoutes(
  router: Router,
  syncEngine: SecretsSyncEngine,
): void {
  router.get('/api/secrets', async () => {
    const rows = await syncEngine.computeSyncStatus();
    return jsonSuccess(rows);
  });

  router.post('/api/secrets/sync', async (req) => {
    let body: { names?: string[]; targets?: string[] } | undefined;
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    if (!body?.names) {
      const report = await syncEngine.syncAll();
      return jsonSuccess(report);
    }

    const results = [];
    for (const name of body.names) {
      const targets = (body.targets ?? ['supabase', 'vercel', 'github']) as Array<'supabase' | 'vercel' | 'github'>;
      const syncResults = await syncEngine.syncSecret(name, targets);
      results.push({ name, results: syncResults });
    }
    return jsonSuccess(results);
  });
}
