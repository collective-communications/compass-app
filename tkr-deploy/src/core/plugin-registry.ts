import type { ProviderAdapter } from '../types/provider.js';
import type { ProviderPlugin, PluginDeployStep, SecretMapping, SyncTargetAdapter } from '../types/plugin.js';

/** Aggregated secret-to-target mapping entry. */
export interface SecretTargetEntry {
  vaultKey: string;
  targetKey: string;
  targetId: string;
}

/** Stores loaded provider plugins and provides aggregate lookups. */
export class PluginRegistry {
  private readonly plugins: Map<string, ProviderPlugin> = new Map();

  register(plugin: ProviderPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Duplicate provider plugin id: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): ProviderPlugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): ProviderPlugin[] {
    return Array.from(this.plugins.values());
  }

  get size(): number {
    return this.plugins.size;
  }

  /** All provider adapters (for HealthAggregator). */
  allAdapters(): ProviderAdapter[] {
    return this.getAll().map((p) => p.adapter);
  }

  /** All deploy steps from all providers, sorted by order. */
  allDeploySteps(): PluginDeployStep[] {
    return this.getAll()
      .flatMap((p) => p.deploySteps)
      .sort((a, b) => a.order - b.order);
  }

  /** All sync target adapters, keyed by provider id. */
  allSyncTargets(): Map<string, SyncTargetAdapter> {
    const targets = new Map<string, SyncTargetAdapter>();
    for (const plugin of this.getAll()) {
      if (plugin.syncTarget) {
        targets.set(plugin.id, plugin.syncTarget);
      }
    }
    return targets;
  }

  /** All secret mappings from all providers, expanded with target id. */
  allSecretMappings(): SecretTargetEntry[] {
    const entries: SecretTargetEntry[] = [];
    for (const plugin of this.getAll()) {
      if (!plugin.syncTarget) continue;
      for (const mapping of plugin.secretMappings) {
        entries.push({
          vaultKey: mapping.vaultKey,
          targetKey: mapping.targetKey ?? mapping.vaultKey,
          targetId: plugin.id,
        });
      }
    }
    return entries;
  }

  /** Build manifest data for the frontend. */
  manifest(dashboardName: string): ManifestData {
    const coreScreens = [
      { label: 'Overview', path: '/', modulePath: 'screens/overview.js' },
      { label: 'Secrets', path: '/secrets', modulePath: 'screens/secrets.js' },
    ];
    const providerScreens = this.getAll().map((p) => ({
      label: p.screen.label,
      path: p.screen.path,
      modulePath: p.screen.modulePath,
      providerId: p.id,
    }));
    return {
      name: dashboardName,
      screens: [...coreScreens, ...providerScreens],
    };
  }
}

export interface ManifestScreen {
  label: string;
  path: string;
  modulePath: string;
  providerId?: string;
}

export interface ManifestData {
  name: string;
  screens: ManifestScreen[];
}
