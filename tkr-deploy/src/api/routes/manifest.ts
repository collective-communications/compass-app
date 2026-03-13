import type { PluginRegistry } from '../../core/plugin-registry.js';
import type { Router } from '../router.js';
import { jsonSuccess } from '../router.js';

export function registerManifestRoutes(
  router: Router,
  registry: PluginRegistry,
  dashboardName: string,
): void {
  router.get('/api/manifest', async () => {
    return jsonSuccess(registry.manifest(dashboardName));
  });
}
