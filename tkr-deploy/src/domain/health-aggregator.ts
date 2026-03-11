import type { ProviderAdapter, ProviderStatus } from '../types/provider.js';
import type { VaultClient } from '../types/vault.js';

export interface HealthAggregatorConfig {
  adapters: ProviderAdapter[];
  vaultClient: VaultClient;
  pollIntervalMs?: number;
  adapterTimeoutMs?: number;
}

export type RollupStatus = 'healthy' | 'warning' | 'down';

export interface ProviderHealthResult {
  provider: string;
  status: ProviderStatus;
  latencyMs: number;
  label: string;
  error?: string;
  checkedAt: string;
}

export interface HealthSnapshot {
  providers: ProviderHealthResult[];
  rollup: RollupStatus;
  checkedAt: string;
}

function computeRollup(statuses: ProviderStatus[]): RollupStatus {
  if (statuses.length === 0) return 'down';
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  if (statuses.every((s) => s === 'down')) return 'down';
  return 'warning';
}

export class HealthAggregator {
  private readonly adapters: ProviderAdapter[];
  private readonly vaultClient: VaultClient;
  private readonly pollIntervalMs: number;
  private readonly adapterTimeoutMs: number;
  private lastResult: HealthSnapshot | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: HealthAggregatorConfig) {
    this.adapters = config.adapters;
    this.vaultClient = config.vaultClient;
    this.pollIntervalMs = config.pollIntervalMs ?? 30_000;
    this.adapterTimeoutMs = config.adapterTimeoutMs ?? 10_000;
  }

  async checkAll(): Promise<HealthSnapshot> {
    const now = new Date().toISOString();

    const adapterChecks = this.adapters.map((adapter) =>
      this.checkAdapter(adapter),
    );
    const vaultCheck = this.checkVault();

    const results = await Promise.allSettled([...adapterChecks, vaultCheck]);

    const providers: ProviderHealthResult[] = results.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        provider: 'unknown',
        status: 'down' as ProviderStatus,
        latencyMs: 0,
        label: 'Unknown',
        error: String(result.reason),
        checkedAt: now,
      };
    });

    const snapshot: HealthSnapshot = {
      providers,
      rollup: computeRollup(providers.map((p) => p.status)),
      checkedAt: now,
    };

    this.lastResult = snapshot;
    return snapshot;
  }

  getLastResult(): HealthSnapshot | null {
    return this.lastResult;
  }

  start(): void {
    if (this.intervalId !== null) return;
    void this.checkAll();
    this.intervalId = setInterval(() => {
      void this.checkAll();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  get isPolling(): boolean {
    return this.intervalId !== null;
  }

  private async checkAdapter(adapter: ProviderAdapter): Promise<ProviderHealthResult> {
    const start = performance.now();
    const checkedAt = new Date().toISOString();
    try {
      const health = await Promise.race([
        adapter.healthCheck(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Adapter timeout')), this.adapterTimeoutMs),
        ),
      ]);
      const latencyMs = Math.round(performance.now() - start);
      return {
        provider: health.provider,
        status: health.status,
        latencyMs,
        label: health.label,
        checkedAt,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        provider: adapter.name,
        status: 'down',
        latencyMs,
        label: adapter.name,
        error: err instanceof Error ? err.message : String(err),
        checkedAt,
      };
    }
  }

  private async checkVault(): Promise<ProviderHealthResult> {
    const start = performance.now();
    const checkedAt = new Date().toISOString();
    try {
      const health = await Promise.race([
        this.vaultClient.health(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Vault timeout')), this.adapterTimeoutMs),
        ),
      ]);
      const latencyMs = Math.round(performance.now() - start);
      const status: ProviderStatus = health.connected && !health.locked ? 'healthy' : 'warning';
      return {
        provider: 'vault',
        status,
        latencyMs,
        label: health.name,
        checkedAt,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        provider: 'vault',
        status: 'down',
        latencyMs,
        label: 'vault',
        error: err instanceof Error ? err.message : String(err),
        checkedAt,
      };
    }
  }
}
