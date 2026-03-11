import type { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import type { VaultClient } from '../../types/vault.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerSecretsRoutes(
  router: Router,
  syncEngine: SecretsSyncEngine,
  vaultClient: VaultClient,
): void {
  router.get('/api/secrets', async () => {
    const rows = await syncEngine.computeSyncStatus();

    // Get vault metadata
    let vaultName = 'compass';
    let vaultLocked = false;
    try {
      const status = await vaultClient.getStatus();
      vaultName = status.name ?? 'compass';
      vaultLocked = status.locked ?? false;
    } catch {
      // Vault unreachable
      vaultLocked = true;
    }

    // Normalize SecretSyncRow[] → UI SecretsResponse shape
    const TARGET_DISPLAY: Record<string, string> = {
      supabase: 'Supabase',
      vercel: 'Vercel',
      github: 'GitHub',
    };

    const secrets = rows.map((row) => {
      const targets = Object.entries(row.targets).map(([name, info]) => ({
        name: TARGET_DISPLAY[name] ?? name,
        state: info.state === 'na' ? 'not_applicable' as const
          : info.state === 'error' ? 'not_applicable' as const
          : info.state === 'unverifiable' ? 'unverifiable' as const
          : info.state,
      }));

      const outOfSync = targets.some(
        (t) => t.state === 'missing' || t.state === 'differs',
      );

      // Mask the hash as a visual indicator (has value or not)
      const maskedValue = row.vaultValueHash
        ? `${row.vaultValueHash.slice(0, 8)}••••`
        : '(empty)';

      return { name: row.name, maskedValue, targets, outOfSync };
    });

    return jsonSuccess({
      vault: {
        name: vaultName,
        locked: vaultLocked,
        secretCount: rows.length,
      },
      secrets,
    });
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

  router.post('/api/secrets/:name/sync', async (_req, params) => {
    const targets: Array<'supabase' | 'vercel' | 'github'> = ['supabase', 'vercel', 'github'];
    const results = await syncEngine.syncSecret(params.name, targets);
    return jsonSuccess({ name: params.name, results });
  });
}
