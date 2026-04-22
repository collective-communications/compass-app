import type { VaultClient } from '../types/vault.js';
import type { SyncTargetAdapter } from '../types/plugin.js';
import type { SecretTargetEntry } from './plugin-registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncState = 'synced' | 'missing' | 'differs' | 'na' | 'error' | 'unverifiable';

export interface SecretSyncRow {
  name: string;
  vaultValueHash: string;
  targets: Record<string, { state: SyncState; valueHash?: string; error?: string }>;
}

export interface SyncResult {
  target: string;
  success: boolean;
  error?: string;
  /** True when a dry-run would have written this target (state was 'missing' or 'differs'). */
  wouldSync?: boolean;
}

export interface SyncAllReport {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  /** Count of target writes that would have occurred in a dry-run. 0 when not a dry-run. */
  wouldSync: number;
  errors: string[];
  rows: Array<{ name: string; results: SyncResult[] }>;
  /** True when the entire run was executed in dry-run mode (no `setSecret` calls). */
  dryRun?: boolean;
}

export interface SecretsSyncEngineConfig {
  vaultClient: VaultClient;
  targets: Map<string, SyncTargetAdapter>;
  mappings: SecretTargetEntry[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class VaultLockedError extends Error {
  constructor() {
    super('Vault is locked');
    this.name = 'VaultLockedError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashValue(value: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(value);
  return hasher.digest('hex');
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class SecretsSyncEngine {
  private readonly vault: VaultClient;
  private readonly targets: Map<string, SyncTargetAdapter>;
  private readonly mappings: SecretTargetEntry[];

  /** All unique target ids from mappings. */
  private readonly targetIds: string[];

  constructor(config: SecretsSyncEngineConfig) {
    this.vault = config.vaultClient;
    this.targets = config.targets;
    this.mappings = config.mappings;
    this.targetIds = [...new Set(config.mappings.map((m) => m.targetId))];
  }

  /** Ensure vault is reachable and unlocked. */
  private async assertVaultUnlocked(): Promise<void> {
    const health = await this.vault.health();
    if (!health.connected || health.locked) {
      throw new VaultLockedError();
    }
  }

  /**
   * Reads all vault secrets and checks each target per the plugin-driven mappings.
   * Returns one row per unique vault key.
   */
  async computeSyncStatus(): Promise<SecretSyncRow[]> {
    await this.assertVaultUnlocked();

    const vaultSecrets = await this.vault.getAll();

    // Pre-fetch remote state from targets (best-effort)
    const remoteState = new Map<string, { secrets?: Map<string, string>; names?: Set<string>; error?: string }>();

    for (const [targetId, target] of this.targets) {
      try {
        if (target.getSecrets) {
          const secrets = await target.getSecrets();
          remoteState.set(targetId, { secrets });
        } else if (target.listSecrets) {
          const names = await target.listSecrets();
          remoteState.set(targetId, { names: new Set(names) });
        } else {
          remoteState.set(targetId, {});
        }
      } catch (err) {
        remoteState.set(targetId, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Group mappings by vault key
    const byVaultKey = new Map<string, SecretTargetEntry[]>();
    for (const mapping of this.mappings) {
      const existing = byVaultKey.get(mapping.vaultKey) ?? [];
      existing.push(mapping);
      byVaultKey.set(mapping.vaultKey, existing);
    }

    const rows: SecretSyncRow[] = [];

    for (const [secretName, mappings] of byVaultKey) {
      const vaultValue = vaultSecrets.get(secretName) ?? '';
      const vaultHash = vaultValue ? hashValue(vaultValue) : '';

      // Initialize all targets as 'na'
      const targets: Record<string, { state: SyncState; valueHash?: string; error?: string }> = {};
      for (const targetId of this.targetIds) {
        targets[targetId] = { state: 'na' };
      }

      for (const mapping of mappings) {
        const target = this.targets.get(mapping.targetId);
        if (!target) continue;

        const remote = remoteState.get(mapping.targetId);
        if (!remote) continue;

        if (remote.error) {
          targets[mapping.targetId] = { state: 'error', error: remote.error };
          continue;
        }

        if (!vaultValue) {
          targets[mapping.targetId] = { state: 'missing' };
          continue;
        }

        if (remote.secrets) {
          const remoteValue = remote.secrets.get(mapping.targetKey);
          if (!remoteValue) {
            targets[mapping.targetId] = { state: 'missing' };
          } else if (remoteValue.startsWith('eyJ') || remoteValue === '(encrypted)') {
            targets[mapping.targetId] = { state: 'synced' };
          } else {
            const remoteHash = hashValue(remoteValue);
            targets[mapping.targetId] = vaultHash === remoteHash
              ? { state: 'synced', valueHash: remoteHash }
              : { state: 'differs', valueHash: remoteHash };
          }
        } else if (remote.names) {
          targets[mapping.targetId] = remote.names.has(mapping.targetKey)
            ? { state: 'synced' }
            : { state: 'missing' };
        } else {
          targets[mapping.targetId] = { state: 'unverifiable' };
        }
      }

      rows.push({ name: secretName, vaultValueHash: vaultHash, targets });
    }

    return rows;
  }

  /**
   * Pushes a single vault secret to specified targets.
   *
   * When `opts.dryRun` is true, no `setSecret` calls are made — each target that
   * would otherwise be written is marked with `wouldSync: true` instead. Empty
   * vault values and unknown targets still produce failure entries unchanged.
   */
  async syncSecret(
    name: string,
    targetIds: string[],
    opts?: { dryRun?: boolean },
  ): Promise<SyncResult[]> {
    await this.assertVaultUnlocked();

    const dryRun = opts?.dryRun === true;
    const vaultValue = await this.vault.getSecret(name);
    const results: SyncResult[] = [];

    for (const targetId of targetIds) {
      try {
        if (!vaultValue) {
          results.push({ target: targetId, success: false, error: 'Empty vault value' });
          continue;
        }

        const target = this.targets.get(targetId);
        if (!target) {
          results.push({ target: targetId, success: false, error: `Unknown target: ${targetId}` });
          continue;
        }

        const mapping = this.mappings.find((m) => m.vaultKey === name && m.targetId === targetId);
        const remoteKey = mapping?.targetKey ?? name;

        if (dryRun) {
          results.push({ target: targetId, success: true, wouldSync: true });
          continue;
        }

        await target.setSecret(remoteKey, vaultValue);
        results.push({ target: targetId, success: true });
      } catch (err) {
        results.push({
          target: targetId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /**
   * Computes status for all secrets, syncs anything missing or differs.
   *
   * When `opts.dryRun` is true, no `setSecret` calls are made. Every target that
   * would otherwise be written is reported with `wouldSync: true` and counted in
   * `report.wouldSync`. Empty-vault skips still count toward `report.skipped`.
   * The returned `report.dryRun` flag reflects the mode the run was executed in.
   */
  async syncAll(opts?: { dryRun?: boolean }): Promise<SyncAllReport> {
    const dryRun = opts?.dryRun === true;
    const statusRows = await this.computeSyncStatus();
    const vaultSecrets = await this.vault.getAll();

    const report: SyncAllReport = {
      total: statusRows.length,
      synced: 0,
      failed: 0,
      skipped: 0,
      wouldSync: 0,
      errors: [],
      rows: [],
      dryRun,
    };

    for (const row of statusRows) {
      const vaultValue = vaultSecrets.get(row.name) ?? '';

      const targetsToSync: string[] = [];
      for (const [targetId, info] of Object.entries(row.targets)) {
        if (info.state === 'missing' || info.state === 'differs') {
          targetsToSync.push(targetId);
        }
      }

      if (targetsToSync.length === 0) continue;

      if (!vaultValue) {
        report.skipped += targetsToSync.length;
        report.rows.push({
          name: row.name,
          results: targetsToSync.map((t) => ({ target: t, success: false, error: 'Empty vault value — skipped' })),
        });
        continue;
      }

      const results: SyncResult[] = [];
      for (const targetId of targetsToSync) {
        try {
          const target = this.targets.get(targetId);
          if (!target) {
            results.push({ target: targetId, success: false, error: `Unknown target: ${targetId}` });
            report.failed++;
            continue;
          }

          const mapping = this.mappings.find((m) => m.vaultKey === row.name && m.targetId === targetId);
          const remoteKey = mapping?.targetKey ?? row.name;

          if (dryRun) {
            results.push({ target: targetId, success: true, wouldSync: true });
            report.wouldSync++;
            continue;
          }

          await target.setSecret(remoteKey, vaultValue);
          results.push({ target: targetId, success: true });
          report.synced++;
        } catch (err) {
          results.push({
            target: targetId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
          report.failed++;
        }
      }

      report.rows.push({ name: row.name, results });
    }

    report.errors = report.rows
      .flatMap((r) => r.results.filter((s) => !s.success && s.error).map((s) => `${r.name}/${s.target}: ${s.error}`));

    return report;
  }
}
