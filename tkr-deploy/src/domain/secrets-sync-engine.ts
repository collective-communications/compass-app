import type { VaultClient } from '../types/vault.js';
import type { SupabaseAdapter } from '../adapters/supabase-adapter.js';
import type { VercelAdapter } from '../adapters/vercel-adapter.js';
import type { GitHubAdapter } from '../adapters/github-adapter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TargetName = 'supabase' | 'vercel' | 'github';
export type SyncState = 'synced' | 'missing' | 'differs' | 'na' | 'error' | 'unverifiable';

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
  errors: string[];
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
  // Supabase
  VITE_SUPABASE_URL:         { supabase: false, vercel: true,  github: true },
  VITE_SUPABASE_ANON_KEY:    { supabase: false, vercel: true,  github: true },
  SUPABASE_URL:              { supabase: false, vercel: true,  github: true },
  SUPABASE_SERVICE_ROLE_KEY: { supabase: false, vercel: true,  github: true },
  SUPABASE_ACCESS_TOKEN:     { supabase: false, vercel: false, github: true },
  SUPABASE_PROJECT_REF:      { supabase: false, vercel: false, github: true },
  SUPABASE_DB_PASSWORD:      { supabase: false, vercel: false, github: true },
  // Vercel
  VERCEL_TOKEN:              { supabase: false, vercel: false, github: true },
  VERCEL_ORG_ID:             { supabase: false, vercel: false, github: true },
  VERCEL_PROJECT_ID:         { supabase: false, vercel: false, github: true },
  // GitHub
  GITHUB_TOKEN:              { supabase: false, vercel: false, github: false },
  GITHUB_OWNER:              { supabase: false, vercel: false, github: false },
  GITHUB_REPO:               { supabase: false, vercel: false, github: false },
  // Resend
  RESEND_CCC_SEND:           { supabase: true,  vercel: true,  github: true },
  RESEND_CCC_ADMIN:          { supabase: false, vercel: false, github: false },
  RESEND_FROM_ADDRESS:       { supabase: true,  vercel: true,  github: false },
  // OpenAI
  OPENAI_API_KEY:            { supabase: true,  vercel: true,  github: true },
  // App
  VITE_APP_URL:              { supabase: false, vercel: true,  github: false },
  APP_URL:                   { supabase: false, vercel: true,  github: false },
  // E2E
  E2E_SUPABASE_URL:          { supabase: false, vercel: false, github: true },
  E2E_SUPABASE_SERVICE_KEY:  { supabase: false, vercel: false, github: true },
  // Deploy
  HEALTH_CHECK_URL:          { supabase: false, vercel: false, github: false },
  DEPLOY_PORT:               { supabase: false, vercel: false, github: false },
};

// When syncing to a target, some vault keys need to be renamed
// e.g. edge functions expect RESEND_API_KEY, but vault stores RESEND_CCC_SEND
const TARGET_KEY_REMAP: Partial<Record<string, Partial<Record<TargetName, string>>>> = {
  RESEND_CCC_SEND: { supabase: 'RESEND_API_KEY' },
};

function targetKeyName(vaultName: string, target: TargetName): string {
  return TARGET_KEY_REMAP[vaultName]?.[target] ?? vaultName;
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

      // Supabase — secrets are write-only (no read API). Can't verify.
      if (targets.supabase) {
        row.targets.supabase = vaultValue
          ? { state: 'unverifiable' }
          : { state: 'missing' };
      }

      // Vercel — encrypted env vars can't be value-compared, only check existence
      if (targets.vercel) {
        const remoteKey = targetKeyName(secretName, 'vercel');
        if (vercelError) {
          row.targets.vercel = { state: 'error', error: vercelError };
        } else if (vercelEnvVars.has(remoteKey)) {
          const remoteValue = vercelEnvVars.get(remoteKey)!;
          // Vercel encrypted values start with 'eyJ' (base64 JSON). Can't compare.
          if (remoteValue.startsWith('eyJ') || remoteValue === '(encrypted)') {
            row.targets.vercel = { state: 'synced' };
          } else {
            const remoteHash = hashValue(remoteValue);
            row.targets.vercel = vaultHash === remoteHash
              ? { state: 'synced', valueHash: remoteHash }
              : { state: 'differs', valueHash: remoteHash };
          }
        } else {
          row.targets.vercel = { state: 'missing' };
        }
      }

      // GitHub — can only check name existence, never 'differs'
      if (targets.github) {
        const remoteKey = targetKeyName(secretName, 'github');
        if (githubError) {
          row.targets.github = { state: 'error', error: githubError };
        } else if (githubSecretNames.has(remoteKey)) {
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

        const remoteKey = targetKeyName(name, target);
        switch (target) {
          case 'supabase':
            await this.adapters.supabase.setSecrets({ [remoteKey]: vaultValue });
            break;
          case 'vercel':
            await this.adapters.vercel.setEnvVar(remoteKey, vaultValue);
            break;
          case 'github':
            await this.adapters.github.setSecret(remoteKey, vaultValue);
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
      errors: [],
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

    report.errors = report.rows
      .flatMap((r) => r.results.filter((s) => !s.success && s.error).map((s) => `${r.name}/${s.target}: ${s.error}`));

    return report;
  }
}
