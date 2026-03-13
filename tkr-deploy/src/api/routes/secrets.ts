import type { SecretsSyncEngine } from '../../core/secrets-sync-engine.js';
import type { VaultClient } from '../../types/vault.js';
import type { PluginRegistry } from '../../core/plugin-registry.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerSecretsRoutes(
  router: Router,
  syncEngine: SecretsSyncEngine,
  vaultClient: VaultClient,
  registry?: PluginRegistry,
): void {
  router.get('/api/secrets', async () => {
    const rows = await syncEngine.computeSyncStatus();

    let vaultName = 'vault';
    let vaultLocked = false;
    try {
      const status = await vaultClient.getStatus();
      vaultName = status.name ?? 'vault';
      vaultLocked = status.locked ?? false;
    } catch {
      vaultLocked = true;
    }

    // Build target display names from registry
    const targetDisplay: Record<string, string> = {};
    if (registry) {
      for (const plugin of registry.getAll()) {
        targetDisplay[plugin.id] = plugin.displayName;
      }
    }

    const secrets = rows.map((row) => {
      const targets = Object.entries(row.targets).map(([name, info]) => ({
        name: targetDisplay[name] ?? name,
        id: name,
        state: info.state === 'na' ? 'not_applicable' as const
          : info.state === 'error' ? 'not_applicable' as const
          : info.state === 'unverifiable' ? 'unverifiable' as const
          : info.state,
      }));

      const outOfSync = targets.some(
        (t) => t.state === 'missing' || t.state === 'differs',
      );

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

    const allTargetIds = registry
      ? registry.getAll().filter((p) => p.syncTarget).map((p) => p.id)
      : [];

    const results = [];
    for (const name of body.names) {
      const targets = body.targets ?? allTargetIds;
      const syncResults = await syncEngine.syncSecret(name, targets);
      results.push({ name, results: syncResults });
    }
    return jsonSuccess(results);
  });

  router.post('/api/secrets/:name/sync', async (_req, params) => {
    const allTargetIds = registry
      ? registry.getAll().filter((p) => p.syncTarget).map((p) => p.id)
      : [];
    const results = await syncEngine.syncSecret(params.name, allTargetIds);
    return jsonSuccess({ name: params.name, results });
  });
}
