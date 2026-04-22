import type { ProviderAdapter } from './provider.js';
import type { VaultClient } from './vault.js';
import type { Router } from '../api/router.js';

/** Secret mapping: which vault keys this provider can receive as a sync target. */
export interface SecretMapping {
  /** Vault key name. */
  vaultKey: string;
  /** Renamed key at the target (defaults to vaultKey if omitted). */
  targetKey?: string;
}

/** A deploy step contributed by a provider plugin. */
export interface PluginDeployStep {
  /** Unique step identifier. */
  id: string;
  /** Human-readable label for the UI. */
  label: string;
  /** Provider id this step belongs to (used for activity log). */
  provider: string;
  /** Ordering weight — lower runs first. Core syncSecrets=0, healthCheck=900. */
  order: number;
  /** Execute the step. Returns a detail string on success. */
  execute: () => Promise<string>;
}

/** Status dot colour for detail-section items. */
export type DotStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/**
 * Typed descriptor for a detail section on a provider's Deploy-screen card.
 * Discriminated by `kind`; the UI renders each variant via a single `SectionRenderer`.
 * Use `custom-module` as an escape hatch when no built-in kind fits.
 */
export type DetailSection =
  | { kind: 'kv'; title: string; items: { label: string; value: string | null }[] }
  | { kind: 'metric-grid'; title: string; metrics: { label: string; value: string; status?: DotStatus }[] }
  | { kind: 'list'; title: string; items: { label: string; meta?: string; status?: DotStatus }[] }
  | { kind: 'progress'; title: string; current: number; total: number; meta?: string }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] }
  | { kind: 'custom-module'; title: string; modulePath: string };

/** Frontend screen descriptor — tells the shell and router what to render. */
export interface PluginScreen {
  /** Nav pill label. */
  label: string;
  /** URL path (e.g. "/database"). */
  path: string;
  /** Module path relative to ui root for dynamic import (e.g. "provider-screens/database.js"). */
  modulePath: string;
  /** Lazy detail sections — called when the Deploy screen expands this provider's card. */
  detailSections?: () => Promise<DetailSection[]>;
}

/** Adapter for pushing secrets to a sync target. */
export interface SyncTargetAdapter {
  /** Push a single secret to this target. */
  setSecret(key: string, value: string): Promise<void>;
  /** List secret names at the target (for existence checks). */
  listSecrets?(): Promise<string[]>;
  /** Read secret values from the target (for diff comparison). */
  getSecrets?(): Promise<Map<string, string>>;
  /** Whether secret values can be read back for hash comparison. */
  readonly verifiable: boolean;
}

/** The full provider plugin contract. */
export interface ProviderPlugin {
  /** Unique identifier (e.g. "supabase", "vercel"). */
  readonly id: string;
  /** Display name (e.g. "Supabase", "Vercel"). */
  readonly displayName: string;
  /** The adapter instance for health checks. */
  readonly adapter: ProviderAdapter;
  /** Secret keys this provider needs from vault. */
  readonly secretMappings: SecretMapping[];
  /** Sync target capabilities (omit if this provider cannot receive secrets). */
  readonly syncTarget?: SyncTargetAdapter;
  /** Deploy steps this provider contributes. */
  readonly deploySteps: PluginDeployStep[];
  /** Frontend screen definition. */
  readonly screen: PluginScreen;
  /** Register API routes for this provider. */
  registerRoutes(router: Router, ctx: PluginRouteContext): void;
}

/** Context passed to plugin route registration. */
export interface PluginRouteContext {
  vaultClient: VaultClient;
  syncEngine: {
    syncAll(): Promise<{ synced: number; failed: number; errors: string[] }>;
    syncSecret(name: string, targets: string[]): Promise<Array<{ target: string; success: boolean; error?: string }>>;
  };
}

/** Factory: static config → (runtime context) → initialized plugin. */
export type ProviderPluginFactory = (ctx: PluginFactoryContext) => ProviderPlugin;

/** Runtime context provided to plugin factories at boot time. */
export interface PluginFactoryContext {
  /** Snapshot of vault secrets at boot (may be empty if vault was locked). */
  secrets: Map<string, string>;
  /** Vault client for direct access. */
  vaultClient: VaultClient;
  /** Lazy secret resolver — always fetches current value from vault. Use this for adapter credentials. */
  getSecret(name: string): Promise<string>;
}

/** Project-level configuration for tkr-deploy. */
export interface DeployConfig {
  /** Dashboard display name (default: "tkr-deploy"). */
  name?: string;
  /** Vault connection settings. */
  vault: { url: string; vaultName: string };
  /** HTTP server port (default: 42043). */
  port?: number;
  /** Provider plugin factories to load. */
  providers: ProviderPluginFactory[];
}
