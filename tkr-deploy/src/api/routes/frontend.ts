import type { VercelAdapter } from '../../adapters/vercel-adapter.js';
import type { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerFrontendRoutes(
  router: Router,
  vercel: VercelAdapter,
  syncEngine: SecretsSyncEngine,
): void {
  router.get('/api/frontend/project', async () => {
    const project = await vercel.getProject();
    return jsonSuccess({
      name: project.name,
      framework: project.framework ?? 'unknown',
      productionUrl: project.alias[0] ? `https://${project.alias[0]}` : '',
    });
  });

  router.get('/api/frontend/deployments', async () => {
    const deployments = await vercel.getDeployments();
    const statusMap: Record<string, string> = {
      READY: 'Ready', BUILDING: 'Building', ERROR: 'Error', QUEUED: 'Queued',
      CANCELED: 'Error', INITIALIZING: 'Queued',
    };
    const toUiShape = (d: typeof deployments[number]) => ({
      id: d.uid,
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
    const envVars = await vercel.getEnvVars();
    const variables = envVars.map((e) => ({
      key: e.key,
      value: e.value ?? '(encrypted)',
      vaultMatch: 'unknown' as const,
      target: e.target?.[0] ?? 'production',
    }));
    return jsonSuccess({ variables, vaultOnline: true });
  });

  router.post('/api/frontend/env/sync', async () => {
    const report = await syncEngine.syncAll();
    return jsonSuccess(report);
  });
}
