import type { VercelAdapter } from './adapter.js';
import type { VaultClient } from '../../src/types/vault.js';
import type { PluginRouteContext } from '../../src/types/plugin.js';
import type { Router } from '../../src/api/router.js';
import { jsonSuccess, jsonError } from '../../src/api/router.js';

export function registerFrontendRoutes(
  router: Router,
  vercel: VercelAdapter,
  syncEngine: PluginRouteContext['syncEngine'],
  vaultClient: VaultClient,
): void {
  router.get('/api/frontend/project', async () => {
    try {
      const project = await vercel.getProject();

      // Derive dashboard URL from a deployment's inspectorUrl (format: https://vercel.com/{team}/{project}/...)
      let dashboardUrl = '';
      try {
        const deployments = await vercel.getDeployments(1);
        const inspector = deployments[0]?.inspectorUrl;
        if (inspector) {
          const parts = new URL(inspector).pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
            dashboardUrl = `https://vercel.com/${parts[0]}/${parts[1]}`;
          }
        }
      } catch {
        // best-effort
      }

      return jsonSuccess({
        name: project.name,
        framework: project.framework ?? 'unknown',
        productionUrl: project.alias[0] ? `https://${project.alias[0]}` : '',
        dashboardUrl,
      });
    } catch {
      return jsonSuccess({
        name: 'unavailable',
        framework: 'unknown',
        productionUrl: '',
        dashboardUrl: '',
        error: 'Vercel API unavailable — check vault/token',
      });
    }
  });

  router.get('/api/frontend/deployments', async () => {
    try {
      const deployments = await vercel.getDeployments();
      const statusMap: Record<string, string> = {
        READY: 'Ready', BUILDING: 'Building', ERROR: 'Error', QUEUED: 'Queued',
        CANCELED: 'Error', INITIALIZING: 'Queued',
      };
      const toUiShape = (d: typeof deployments[number]) => ({
        id: d.uid,
        url: d.url,
        status: statusMap[d.status] ?? d.status,
        commitHash: d.commitSha?.slice(0, 7) ?? '',
        commitMessage: d.commitMessage ?? '',
        branch: d.branch ?? '',
        duration: d.duration ? `${Math.round(d.duration / 1000)}s` : '—',
        deployedAt: d.createdAt,
        errorMessage: d.errorMessage,
        inspectorUrl: d.inspectorUrl,
      });
      const prod = deployments.find((d) => d.target === 'production');
      const current = prod ? toUiShape(prod) : toUiShape(deployments[0]);
      const history = deployments.filter((d) => d !== prod).map(toUiShape);
      return jsonSuccess({ current, history });
    } catch {
      return jsonSuccess({
        current: null,
        history: [],
        error: 'Vercel API unavailable — check vault/token',
      });
    }
  });

  router.post('/api/frontend/redeploy', async () => {
    const current = await vercel.getCurrentDeployment();
    if (!current) {
      return jsonError('No current deployment found', 404);
    }
    const newUid = await vercel.triggerRedeploy(current.uid);
    return jsonSuccess({ uid: newUid });
  });

  router.post('/api/frontend/promote/:uid', async (_req, params) => {
    await vercel.promoteDeployment(params.uid);
    return jsonSuccess({ promoted: params.uid });
  });

  router.get('/api/frontend/env', async () => {
    let envVars;
    try {
      envVars = await vercel.getEnvVars();
    } catch {
      return jsonSuccess({
        variables: [],
        vaultOnline: false,
        error: 'Vercel API unavailable — check vault/token',
      });
    }

    let vaultSecrets: Map<string, string> = new Map();
    let vaultOnline = false;
    try {
      const health = await vaultClient.health();
      if (health.connected && !health.locked) {
        vaultOnline = true;
        vaultSecrets = await vaultClient.getAll();
      }
    } catch {
      // vault unavailable
    }

    const variables = envVars.map((e) => {
      const vercelValue = e.value ?? '';
      const vaultValue = vaultSecrets.get(e.key) ?? '';
      const isEncrypted = vercelValue.startsWith('eyJ') || vercelValue === '(encrypted)' || vercelValue === '';

      let vaultMatch: 'match' | 'mismatch' | 'missing' | 'unknown';
      if (!vaultOnline) {
        vaultMatch = 'unknown';
      } else if (!vaultValue) {
        vaultMatch = 'missing';
      } else if (isEncrypted) {
        // Can't compare encrypted values — existence in vault is sufficient
        vaultMatch = 'match';
      } else {
        vaultMatch = vercelValue === vaultValue ? 'match' : 'mismatch';
      }

      return {
        key: e.key,
        value: vercelValue || '(encrypted)',
        vaultMatch,
        target: e.target?.[0] ?? 'production',
      };
    });
    return jsonSuccess({ variables, vaultOnline });
  });

  router.post('/api/frontend/env/sync', async () => {
    const report = await syncEngine.syncAll();
    return jsonSuccess(report);
  });
}
