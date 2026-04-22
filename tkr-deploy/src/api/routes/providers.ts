import type { PluginRegistry } from '../../core/plugin-registry.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

/**
 * Register provider metadata routes.
 *
 * - `GET /api/providers/:id/sections` — returns the plugin's lazily-resolved
 *   {@link import('../../types/plugin.js').DetailSection DetailSection}
 *   descriptors for the Deploy-screen expandable card. Unknown providers
 *   return 404; all other errors propagate to the server-level handler.
 */
export function registerProviderRoutes(
  router: Router,
  registry: PluginRegistry,
): void {
  router.get('/api/providers/:id/sections', async (_req, params) => {
    try {
      const sections = await registry.getDetailSections(params.id);
      return jsonSuccess({ sections });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // PluginRegistry throws `Unknown provider: <id>` for missing plugins;
      // surface that as a clean 404.
      if (message.startsWith('Unknown provider:')) {
        return jsonError(message, 404);
      }
      throw err;
    }
  });
}
