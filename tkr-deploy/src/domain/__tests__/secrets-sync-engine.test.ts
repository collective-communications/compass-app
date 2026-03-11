import { describe, test, expect, mock, beforeEach } from 'bun:test';
import {
  SecretsSyncEngine,
  VaultLockedError,
  type SecretsSyncEngineConfig,
  type TargetName,
} from '../secrets-sync-engine.js';
import type { VaultClient } from '../../types/vault.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockVault(overrides: Partial<VaultClient> = {}): VaultClient {
  const secrets = new Map<string, string>([
    ['SUPABASE_URL', 'https://abc.supabase.co'],
    ['SUPABASE_ANON_KEY', 'anon-key-123'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'srv-key-456'],
    ['SUPABASE_DB_PASSWORD', 'db-pass'],
    ['SUPABASE_ACCESS_TOKEN', 'sb-token'],
    ['SUPABASE_PROJECT_ID', 'proj-id'],
    ['VERCEL_TOKEN', 'v-token'],
    ['VERCEL_ORG_ID', 'v-org'],
    ['RESEND_API_KEY', 'resend-key'],
  ]);

  return {
    health: mock(() => Promise.resolve({ connected: true, locked: false, name: 'test-vault' })),
    listSecrets: mock(() => Promise.resolve([...secrets.keys()])),
    getSecret: mock((name: string) => Promise.resolve(secrets.get(name) ?? '')),
    getAll: mock(() => Promise.resolve(new Map(secrets))),
    getStatus: mock(() => Promise.resolve({ connected: true, locked: false, name: 'test-vault', secretCount: secrets.size })),
    ...overrides,
  };
}

function hashValue(value: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(value);
  return hasher.digest('hex');
}

function createMockAdapters(overrides?: {
  supabase?: Partial<SecretsSyncEngineConfig['adapters']['supabase']>;
  vercel?: Partial<SecretsSyncEngineConfig['adapters']['vercel']>;
  github?: Partial<SecretsSyncEngineConfig['adapters']['github']>;
}): SecretsSyncEngineConfig['adapters'] {
  return {
    supabase: {
      setSecrets: mock(() => Promise.resolve()),
      ...overrides?.supabase,
    },
    vercel: {
      setEnvVar: mock(() => Promise.resolve()),
      getEnvVars: mock(() => Promise.resolve([])),
      ...overrides?.vercel,
    },
    github: {
      setSecret: mock(() => Promise.resolve()),
      listSecrets: mock(() => Promise.resolve([])),
      ...overrides?.github,
    },
  };
}

function createEngine(
  vaultOverrides?: Partial<VaultClient>,
  adapterOverrides?: Parameters<typeof createMockAdapters>[0],
): SecretsSyncEngine {
  return new SecretsSyncEngine({
    vaultClient: createMockVault(vaultOverrides),
    adapters: createMockAdapters(adapterOverrides),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SecretsSyncEngine', () => {
  // 1. computeSyncStatus — all synced
  test('computeSyncStatus returns synced when all targets match', async () => {
    const vault = createMockVault();
    const vaultSecrets = await vault.getAll();

    // Vercel has matching values for its applicable secrets
    const vercelEnvs = [
      { key: 'SUPABASE_URL', value: 'https://abc.supabase.co', target: ['production'], type: 'encrypted', id: '1' },
      { key: 'SUPABASE_ANON_KEY', value: 'anon-key-123', target: ['production'], type: 'encrypted', id: '2' },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'srv-key-456', target: ['production'], type: 'encrypted', id: '3' },
      { key: 'RESEND_API_KEY', value: 'resend-key', target: ['production'], type: 'encrypted', id: '4' },
    ];

    // GitHub has all secret names
    const githubNames = [...vaultSecrets.keys()];

    const engine = new SecretsSyncEngine({
      vaultClient: vault,
      adapters: createMockAdapters({
        vercel: { getEnvVars: mock(() => Promise.resolve(vercelEnvs)) },
        github: { listSecrets: mock(() => Promise.resolve(githubNames)) },
      }),
    });

    const rows = await engine.computeSyncStatus();

    // Vercel-applicable secrets should be synced
    const supabaseUrl = rows.find((r) => r.name === 'SUPABASE_URL')!;
    expect(supabaseUrl.targets.vercel.state).toBe('synced');
    expect(supabaseUrl.targets.github.state).toBe('synced');
    expect(supabaseUrl.targets.supabase.state).toBe('na');

    const resend = rows.find((r) => r.name === 'RESEND_API_KEY')!;
    expect(resend.targets.vercel.state).toBe('synced');
    expect(resend.targets.github.state).toBe('synced');
    // Supabase is always 'missing' since we can't read back
    expect(resend.targets.supabase.state).toBe('missing');
  });

  // 2. computeSyncStatus — mixed states (differs, missing)
  test('computeSyncStatus detects differs and missing states', async () => {
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters: createMockAdapters({
        vercel: {
          getEnvVars: mock(() => Promise.resolve([
            // SUPABASE_URL has different value
            { key: 'SUPABASE_URL', value: 'https://WRONG.supabase.co', target: ['production'], type: 'encrypted', id: '1' },
            // SUPABASE_ANON_KEY is missing (not in list)
          ])),
        },
        github: {
          listSecrets: mock(() => Promise.resolve(['SUPABASE_URL'])), // only one present
        },
      }),
    });

    const rows = await engine.computeSyncStatus();

    const supabaseUrl = rows.find((r) => r.name === 'SUPABASE_URL')!;
    expect(supabaseUrl.targets.vercel.state).toBe('differs');
    expect(supabaseUrl.targets.github.state).toBe('synced');

    const anonKey = rows.find((r) => r.name === 'SUPABASE_ANON_KEY')!;
    expect(anonKey.targets.vercel.state).toBe('missing');
    expect(anonKey.targets.github.state).toBe('missing');
  });

  // 3. computeSyncStatus — GitHub never shows differs
  test('computeSyncStatus never reports differs for GitHub', async () => {
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters: createMockAdapters({
        github: {
          // All secrets exist by name — even if values differ, state is 'synced'
          listSecrets: mock(() => Promise.resolve([
            'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
            'SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_ID',
            'VERCEL_TOKEN', 'VERCEL_ORG_ID', 'RESEND_API_KEY',
          ])),
        },
      }),
    });

    const rows = await engine.computeSyncStatus();

    for (const row of rows) {
      expect(row.targets.github.state).not.toBe('differs');
      // All should be 'synced' since names exist
      expect(row.targets.github.state).toBe('synced');
    }
  });

  // 4. computeSyncStatus — adapter error on one target
  test('computeSyncStatus reports error when adapter throws', async () => {
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters: createMockAdapters({
        vercel: {
          getEnvVars: mock(() => Promise.reject(new Error('Vercel API rate limited'))),
        },
        github: {
          listSecrets: mock(() => Promise.resolve([])),
        },
      }),
    });

    const rows = await engine.computeSyncStatus();

    // All Vercel-applicable secrets should have error state
    const supabaseUrl = rows.find((r) => r.name === 'SUPABASE_URL')!;
    expect(supabaseUrl.targets.vercel.state).toBe('error');
    expect(supabaseUrl.targets.vercel.error).toBe('Vercel API rate limited');

    // GitHub should still work
    expect(supabaseUrl.targets.github.state).toBe('missing');
  });

  // 5. computeSyncStatus — vault locked
  test('computeSyncStatus throws VaultLockedError when vault is locked', async () => {
    const engine = createEngine({
      health: mock(() => Promise.resolve({ connected: true, locked: true, name: 'locked-vault' })),
    });

    await expect(engine.computeSyncStatus()).rejects.toThrow(VaultLockedError);
  });

  // 6. syncSecret — success all targets
  test('syncSecret pushes to all specified targets successfully', async () => {
    const adapters = createMockAdapters();
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters,
    });

    const results = await engine.syncSecret('RESEND_API_KEY', ['supabase', 'vercel', 'github']);

    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.success).toBe(true);
      expect(r.error).toBeUndefined();
    }

    expect(adapters.supabase.setSecrets).toHaveBeenCalledWith({ RESEND_API_KEY: 'resend-key' });
    expect(adapters.vercel.setEnvVar).toHaveBeenCalledWith('RESEND_API_KEY', 'resend-key');
    expect(adapters.github.setSecret).toHaveBeenCalledWith('RESEND_API_KEY', 'resend-key');
  });

  // 7. syncSecret — partial failure
  test('syncSecret continues after one target fails', async () => {
    const adapters = createMockAdapters({
      vercel: {
        setEnvVar: mock(() => Promise.reject(new Error('Vercel 500'))),
        getEnvVars: mock(() => Promise.resolve([])),
      },
    });
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters,
    });

    const results = await engine.syncSecret('SUPABASE_URL', ['vercel', 'github']);

    expect(results).toHaveLength(2);
    expect(results[0].target).toBe('vercel');
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Vercel 500');

    expect(results[1].target).toBe('github');
    expect(results[1].success).toBe(true);
  });

  // 8. syncSecret — empty vault value
  test('syncSecret reports failure for empty vault value', async () => {
    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault({
        getSecret: mock(() => Promise.resolve('')),
      }),
      adapters: createMockAdapters(),
    });

    const results = await engine.syncSecret('SUPABASE_URL', ['vercel', 'github']);

    for (const r of results) {
      expect(r.success).toBe(false);
      expect(r.error).toBe('Empty vault value');
    }
  });

  // 9. syncAll — filters correctly (only syncs missing/differs)
  test('syncAll only syncs missing and differs targets', async () => {
    const adapters = createMockAdapters({
      vercel: {
        // SUPABASE_URL matches, SUPABASE_ANON_KEY differs
        getEnvVars: mock(() => Promise.resolve([
          { key: 'SUPABASE_URL', value: 'https://abc.supabase.co', target: ['production'], type: 'encrypted', id: '1' },
          { key: 'SUPABASE_ANON_KEY', value: 'wrong-key', target: ['production'], type: 'encrypted', id: '2' },
          { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'srv-key-456', target: ['production'], type: 'encrypted', id: '3' },
          { key: 'RESEND_API_KEY', value: 'resend-key', target: ['production'], type: 'encrypted', id: '4' },
        ])),
        setEnvVar: mock(() => Promise.resolve()),
      },
      github: {
        // All present
        listSecrets: mock(() => Promise.resolve([
          'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
          'SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_ID',
          'VERCEL_TOKEN', 'VERCEL_ORG_ID', 'RESEND_API_KEY',
        ])),
        setSecret: mock(() => Promise.resolve()),
      },
    });

    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters,
    });

    const report = await engine.syncAll();

    // SUPABASE_ANON_KEY vercel differs → should sync
    // RESEND_API_KEY supabase is always 'missing' → should sync
    // SUPABASE_URL vercel synced, github synced → should NOT sync vercel/github
    // But supabase targets that are 'missing' should sync

    // Vercel setEnvVar should be called for SUPABASE_ANON_KEY (differs)
    // but NOT for SUPABASE_URL (synced)
    const vercelCalls = (adapters.vercel.setEnvVar as ReturnType<typeof mock>).mock.calls;
    const vercelKeys = vercelCalls.map((c: unknown[]) => c[0]);
    expect(vercelKeys).toContain('SUPABASE_ANON_KEY');
    expect(vercelKeys).not.toContain('SUPABASE_URL');

    expect(report.synced).toBeGreaterThan(0);
  });

  // 10. syncAll — aggregation counts
  test('syncAll returns correct aggregation counts', async () => {
    const adapters = createMockAdapters({
      vercel: {
        getEnvVars: mock(() => Promise.resolve([])), // all missing
        setEnvVar: mock(() => Promise.resolve()),
      },
      github: {
        listSecrets: mock(() => Promise.resolve([])), // all missing
        setSecret: mock(() => Promise.resolve()),
      },
    });

    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters,
    });

    const report = await engine.syncAll();

    expect(report.total).toBe(9); // 9 secrets in the mapping
    // All targets that are missing/differs should be attempted
    expect(report.synced + report.failed + report.skipped).toBeGreaterThan(0);
    expect(report.failed).toBe(0);
    expect(report.rows.length).toBeGreaterThan(0);
  });

  // 11. Rate limit / retry — errors are caught and reported
  test('syncAll catches adapter errors and reports them without aborting', async () => {
    let callCount = 0;
    const adapters = createMockAdapters({
      vercel: {
        getEnvVars: mock(() => Promise.resolve([])),
        setEnvVar: mock(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Rate limit exceeded'));
          }
          return Promise.resolve();
        }),
      },
      github: {
        listSecrets: mock(() => Promise.resolve([])),
        setSecret: mock(() => Promise.resolve()),
      },
    });

    const engine = new SecretsSyncEngine({
      vaultClient: createMockVault(),
      adapters,
    });

    const report = await engine.syncAll();

    // Should have at least one failure and some successes
    expect(report.failed).toBeGreaterThanOrEqual(1);
    expect(report.synced).toBeGreaterThan(0);

    // Find the failed row
    const failedResult = report.rows
      .flatMap((r) => r.results)
      .find((r) => !r.success && r.error === 'Rate limit exceeded');
    expect(failedResult).toBeDefined();
  });
});
