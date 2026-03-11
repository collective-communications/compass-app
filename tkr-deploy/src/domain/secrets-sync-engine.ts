import type { VaultClient } from '../types/vault.js';
import type { SupabaseAdapter } from '../adapters/supabase-adapter.js';
import type { VercelAdapter } from '../adapters/vercel-adapter.js';
import type { GitHubAdapter } from '../adapters/github-adapter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TargetName = 'supabase' | 'vercel' | 'github';
export type SyncState = 'synced' | 'missing' | 'differs' | 'na' | 'error';

export interface SecretSyncRow {
  name: string;
  vaultValueHash: string;
  targets: Record<TargetName, { state: SyncState; valueHash?: string; error?: string }>;
}

export interface SyncResult {
  target: TargetName;
  success: boolean;
  error?: string;
}

export interface SyncAllReport {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  rows: Array<{ name: string; results: SyncResult[] }>;
}

export interface SecretsSyncEngineConfig {
  vaultClient: VaultClient;
  adapters: {
    supabase: Pick<SupabaseAdapter, 'setSecrets'>;
    vercel: Pick<VercelAdapter, 'setEnvVar' | 'getEnvVars'>;
    github: Pick<GitHubAdapter, 'setSecret' | 'listSecrets'>;
  };
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
// Secret-to-target mapping
// ---------------------------------------------------------------------------

type TargetApplicability = Record<TargetName, boolean>;

const SECRET_TARGET_MAP: Record<string, TargetApplicability> = {
  SUPABASE_URL:              { supabase: false, vercel: true,  github: true },
  SUPABASE_ANON_KEY:         { supabase: false, vercel: true,  github: true },
  SUPABASE_SERVICE_ROLE_KEY: { supabase: false, vercel: true,  github: true },
  SUPABASE_DB_PASSWORD:      { supabase: false, vercel: false, github: true },
  SUPABASE_ACCESS_TOKEN:     { supabase: false, vercel: false, github: true },
  SUPABASE_PROJECT_ID:       { supabase: false, vercel: false, github: true },
  VERCEL_TOKEN:              { supabase: false, vercel: false, github: true },
  VERCEL_ORG_ID:             { supabase: false, vercel: false, github: true },
  RESEND_API_KEY:            { supabase: true,  vercel: true,  github: true },
};

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
  private readonly adapters: SecretsSyncEngineConfig['adapters'];

  constructor(config: SecretsSyncEngineConfig) {
    this.vault = config.vaultClient;
    this.adapters = config.adapters;
  }

  /** Ensure vault is reachable and unlocked. Throws VaultLockedError if locked. */
  private async assertVaultUnlocked(): Promise<void> {
    const health = await this.vault.health();
    if (!health.connected) {
      throw new VaultLockedError();
    }
    if (health.locked) {
      throw new VaultLockedError();
    }
  }

  /**
   * Reads all vault secrets and checks each target per the static mapping.
   * Returns one row per mapped secret.
   */
  async computeSyncStatus(): Promise<SecretSyncRow[]> {
    await this.assertVaultUnlocked();

    const vaultSecrets = await this.vault.getAll();

    // Fetch current state from targets (best-effort)
    let vercelEnvVars: Map<string, string> = new Map();
    let vercelError: string | undefined;
    try {
      const envs = await this.adapters.vercel.getEnvVars();
      for (const env of envs) {
        vercelEnvVars.set(env.key, env.value);
      }
    } catch (err) {
      vercelError = err instanceof Error ? err.message : String(err);
    }

    let githubSecretNames: Set<string> = new Set();
    let githubError: string | undefined;
    try {
      const names = await this.adapters.github.listSecrets();
      githubSecretNames = new Set(names);
    } catch (err) {
      githubError = err instanceof Error ? err.message : String(err);
    }

    const rows: SecretSyncRow[] = [];

    for (const [secretName, targets] of Object.entries(SECRET_TARGET_MAP)) {
      const vaultValue = vaultSecrets.get(secretName) ?? '';
      const vaultHash = vaultValue ? hashValue(vaultValue) : '';

      const row: SecretSyncRow = {
        name: secretName,
        vaultValueHash: vaultHash,
        targets: {
          supabase: { state: 'na' },
          vercel: { state: 'na' },
          github: { state: 'na' },
        },
      };

      // Supabase — we can only push, not read back. Mark as 'na' if not applicable.
      if (targets.supabase) {
        // Supabase doesn't expose a read API for secrets, so we can't determine state.
        // We mark as 'missing' if vault has a value (conservative: assume needs sync).
        row.targets.supabase = { state: 'missing' };
      }

      // Vercel
      if (targets.vercel) {
        if (vercelError) {
          row.targets.vercel = { state: 'error', error: vercelError };
        } else if (vercelEnvVars.has(secretName)) {
          const remoteHash = hashValue(vercelEnvVars.get(secretName)!);
          row.targets.vercel = vaultHash === remoteHash
            ? { state: 'synced', valueHash: remoteHash }
            : { state: 'differs', valueHash: remoteHash };
        } else {
          row.targets.vercel = { state: 'missing' };
        }
      }

      // GitHub — can only check name existence, never 'differs'
      if (targets.github) {
        if (githubError) {
          row.targets.github = { state: 'error', error: githubError };
        } else if (githubSecretNames.has(secretName)) {
          row.targets.github = { state: 'synced' };
        } else {
          row.targets.github = { state: 'missing' };
        }
      }

      rows.push(row);
    }

    return rows;
  }

  /**
   * Pushes a single vault secret to specified targets sequentially.
   * Returns a result per target.
   */
  async syncSecret(name: string, targets: TargetName[]): Promise<SyncResult[]> {
    await this.assertVaultUnlocked();

    const vaultValue = await this.vault.getSecret(name);
    const results: SyncResult[] = [];

    for (const target of targets) {
      try {
        if (!vaultValue) {
          results.push({ target, success: false, error: 'Empty vault value' });
          continue;
        }

        switch (target) {
          case 'supabase':
            await this.adapters.supabase.setSecrets({ [name]: vaultValue });
            break;
          case 'vercel':
            await this.adapters.vercel.setEnvVar(name, vaultValue);
            break;
          case 'github':
            await this.adapters.github.setSecret(name, vaultValue);
            break;
        }

        results.push({ target, success: true });
      } catch (err) {
        results.push({
          target,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /**
   * Computes status for all secrets, syncs anything missing or differs.
   * Empty vault values are skipped. Returns an aggregate report.
   */
  async syncAll(): Promise<SyncAllReport> {
    const statusRows = await this.computeSyncStatus();
    const vaultSecrets = await this.vault.getAll();

    const report: SyncAllReport = {
      total: statusRows.length,
      synced: 0,
      failed: 0,
      skipped: 0,
      rows: [],
    };

    for (const row of statusRows) {
      const vaultValue = vaultSecrets.get(row.name) ?? '';

      // Determine which targets need syncing
      const targetsToSync: TargetName[] = [];
      for (const [target, info] of Object.entries(row.targets) as Array<[TargetName, { state: SyncState }]>) {
        if (info.state === 'missing' || info.state === 'differs') {
          targetsToSync.push(target);
        }
      }

      if (targetsToSync.length === 0) {
        continue;
      }

      // Skip empty vault values
      if (!vaultValue) {
        report.skipped += targetsToSync.length;
        report.rows.push({
          name: row.name,
          results: targetsToSync.map((t) => ({ target: t, success: false, error: 'Empty vault value — skipped' })),
        });
        continue;
      }

      const results: SyncResult[] = [];
      for (const target of targetsToSync) {
        try {
          switch (target) {
            case 'supabase':
              await this.adapters.supabase.setSecrets({ [row.name]: vaultValue });
              break;
            case 'vercel':
              await this.adapters.vercel.setEnvVar(row.name, vaultValue);
              break;
            case 'github':
              await this.adapters.github.setSecret(row.name, vaultValue);
              break;
          }
          results.push({ target, success: true });
          report.synced++;
        } catch (err) {
          results.push({
            target,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
          report.failed++;
        }
      }

      report.rows.push({ name: row.name, results });
    }

    return report;
  }
}
