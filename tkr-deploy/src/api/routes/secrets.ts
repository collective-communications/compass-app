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
    let body: { names?: string[]; targets?: string[]; dryRun?: boolean } | undefined;
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const url = new URL(req.url);
    const dryRun = parseDryRun(url, body?.dryRun);

    if (!body?.names) {
      const report = await syncEngine.syncAll({ dryRun });
      return jsonSuccess(report);
    }

    const allTargetIds = registry
      ? registry.getAll().filter((p) => p.syncTarget).map((p) => p.id)
      : [];

    const results = [];
    for (const name of body.names) {
      const targets = body.targets ?? allTargetIds;
      const syncResults = await syncEngine.syncSecret(name, targets, { dryRun });
      results.push({ name, results: syncResults });
    }
    return jsonSuccess({
      dryRun,
      wouldSync: results
        .flatMap((r) => r.results)
        .filter((s) => s.wouldSync).length,
      results,
    });
  });

  router.post('/api/secrets/:name/sync', async (req, params) => {
    const url = new URL(req.url);

    let body: { targetIds?: string[]; targets?: string[]; dryRun?: boolean } | undefined;
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const dryRun = parseDryRun(url, body?.dryRun);

    const queryTargetIds = url.searchParams.get('targetIds');
    const bodyTargetIds = body?.targetIds ?? body?.targets;
    const explicitTargetIds = bodyTargetIds
      ?? (queryTargetIds ? queryTargetIds.split(',').filter(Boolean) : undefined);

    const targets = explicitTargetIds
      ?? (registry
        ? registry.getAll().filter((p) => p.syncTarget).map((p) => p.id)
        : []);

    const results = await syncEngine.syncSecret(params.name, targets, { dryRun });
    return jsonSuccess({
      name: params.name,
      dryRun,
      wouldSync: results.filter((s) => s.wouldSync).length,
      results,
    });
  });
}

/** Parse `?dryRun=1` (or `true`/`yes`) with body override — explicit body wins. */
function parseDryRun(url: URL, bodyValue: boolean | undefined): boolean {
  if (bodyValue === true) return true;
  if (bodyValue === false) return false;
  const q = url.searchParams.get('dryRun');
  if (!q) return false;
  const v = q.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
