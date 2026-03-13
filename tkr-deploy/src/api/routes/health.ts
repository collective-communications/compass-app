import type { HealthAggregator } from '../../core/health-aggregator.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

const PROVIDER_ROUTE_MAP: Record<string, string> = {
  supabase: 'database',
  vercel: 'frontend',
  resend: 'email',
  github: 'cicd',
  vault: 'secrets',
};

export function registerHealthRoutes(
  router: Router,
  healthAggregator: HealthAggregator,
): void {
  router.get('/api/health', async () => {
    const result = healthAggregator.getLastResult();
    if (!result) {
      return jsonError('No health data available yet', 503);
    }
    const vaultProvider = result.providers.find((p) => p.provider === 'vault');
    const vercelProvider = result.providers.find((p) => p.provider === 'vercel');
    return jsonSuccess({
      rollup: result.rollup,
      checkedAt: result.checkedAt,
      vaultLocked: vaultProvider?.status !== 'healthy',
      deploymentUrl: vercelProvider?.label ? `https://${vercelProvider.label}.vercel.app` : '',
      lastDeployed: null,
      providers: result.providers,
    });
  });

  router.get('/api/providers', async () => {
    const result = healthAggregator.getLastResult();
    if (!result) {
      return jsonError('No health data available yet', 503);
    }
    const providers = result.providers.map((p) => ({
      id: p.provider,
      name: p.label,
      status: p.status,
      metrics: { latency: `${p.latencyMs}ms`, ...(p.error ? { error: p.error } : {}) },
      route: PROVIDER_ROUTE_MAP[p.provider] ?? p.provider,
    }));
    return jsonSuccess({ providers });
  });
}
