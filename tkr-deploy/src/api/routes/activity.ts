import type { DeployOrchestrator } from '../../core/deploy-orchestrator.js';
import type { Router } from '../router.js';
import { jsonSuccess } from '../router.js';

export function registerActivityRoutes(
  router: Router,
  orchestrator: DeployOrchestrator,
): void {
  router.get('/api/activity', async (req) => {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const entries = await orchestrator.getActivityLog(limit);
    return jsonSuccess({ entries });
  });
}
