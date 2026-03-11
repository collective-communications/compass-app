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
    return jsonSuccess(project);
  });

  router.get('/api/frontend/deployments', async () => {
    const deployments = await vercel.getDeployments();
    return jsonSuccess(deployments);
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
    return jsonSuccess(envVars);
  });

  router.post('/api/frontend/env/sync', async () => {
    const report = await syncEngine.syncAll();
    return jsonSuccess(report);
  });
}
