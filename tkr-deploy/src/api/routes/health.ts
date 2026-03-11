import type { HealthAggregator } from '../../domain/health-aggregator.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerHealthRoutes(
  router: Router,
  healthAggregator: HealthAggregator,
): void {
  router.get('/api/health', async () => {
    const result = healthAggregator.getLastResult();
    if (!result) {
      return jsonError('No health data available yet', 503);
    }
    return jsonSuccess({
      rollup: result.rollup,
      checkedAt: result.checkedAt,
      providers: result.providers,
    });
  });

  router.get('/api/providers', async () => {
    const result = healthAggregator.getLastResult();
    if (!result) {
      return jsonError('No health data available yet', 503);
    }
    return jsonSuccess(result.providers);
  });
}
