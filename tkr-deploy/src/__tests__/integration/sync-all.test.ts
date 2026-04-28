import { describe, it, expect } from 'bun:test';
import { MockVaultClient } from '../helpers/mock-vault-client.js';
import { SecretsSyncEngine } from '../../core/secrets-sync-engine.js';
import type { SyncTargetAdapter } from '../../types/plugin.js';
import type { SecretTargetEntry } from '../../core/plugin-registry.js';

function createMockTarget(overrides?: Partial<SyncTargetAdapter>): SyncTargetAdapter {
  return {
    verifiable: false,
    setSecret: async () => {},
    ...overrides,
  };
}

function buildEngine(opts?: {
  secrets?: Record<string, string>;
  githubSecrets?: string[];
}) {
  const vault = new MockVaultClient({
    secrets: opts?.secrets ?? {
      RESEND_CCC_SEND: 're_test_key_123',
      SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key-abc',
      VERCEL_TOKEN: 'tok_vercel_xyz',
    },
  });

  const supabaseTarget = createMockTarget();
  const vercelTarget = createMockTarget({ verifiable: true, getSecrets: async () => new Map() });
  const githubTarget = createMockTarget({
    listSecrets: async () => opts?.githubSecrets ?? [],
  });

  const targets = new Map<string, SyncTargetAdapter>([
    ['supabase', supabaseTarget],
    ['vercel', vercelTarget],
    ['github', githubTarget],
  ]);

  const mappings: SecretTargetEntry[] = [
    { vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_CCC_SEND', targetId: 'supabase' },
    { vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_CCC_SEND', targetId: 'vercel' },
    { vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_CCC_SEND', targetId: 'github' },
    { vaultKey: 'VITE_SUPABASE_ANON_KEY', targetKey: 'VITE_SUPABASE_ANON_KEY', targetId: 'vercel' },
    { vaultKey: 'VITE_SUPABASE_ANON_KEY', targetKey: 'VITE_SUPABASE_ANON_KEY', targetId: 'github' },
    { vaultKey: 'SUPABASE_URL', targetKey: 'SUPABASE_URL', targetId: 'vercel' },
    { vaultKey: 'SUPABASE_URL', targetKey: 'SUPABASE_URL', targetId: 'github' },
  ];

  const engine = new SecretsSyncEngine({ vaultClient: vault, targets, mappings });

  return { vault, engine, supabaseTarget, vercelTarget, githubTarget };
}

describe('integration: computeSyncStatus', () => {
  it('returns rows for all mapped secrets', async () => {
    const { engine } = buildEngine();
    const rows = await engine.computeSyncStatus();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.name).toBeDefined();
      expect(row.targets).toBeDefined();
    }
  });

  it('marks github secrets as synced when present', async () => {
    const { engine } = buildEngine({
      githubSecrets: ['RESEND_CCC_SEND', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL'],
    });
    const rows = await engine.computeSyncStatus();

    const resendRow = rows.find((r: { name: string }) => r.name === 'RESEND_CCC_SEND');
    expect(resendRow).toBeDefined();
    expect(resendRow!.targets.github.state).toBe('synced');
  });

  it('marks github secrets as missing when absent', async () => {
    const { engine } = buildEngine({ githubSecrets: [] });
    const rows = await engine.computeSyncStatus();

    const resendRow = rows.find((r: { name: string }) => r.name === 'RESEND_CCC_SEND');
    expect(resendRow).toBeDefined();
    expect(resendRow!.targets.github.state).toBe('missing');
  });

  it('throws when vault is locked', async () => {
    const { engine, vault } = buildEngine();
    vault.lock();
    await expect(engine.computeSyncStatus()).rejects.toThrow();
  });
});

describe('integration: syncAll', () => {
  it('returns a report with synced counts', async () => {
    const { engine } = buildEngine();
    const report = await engine.syncAll();

    expect(report.total).toBeGreaterThan(0);
    expect(typeof report.synced).toBe('number');
    expect(typeof report.failed).toBe('number');
    expect(typeof report.skipped).toBe('number');
  });

  it('pushes secrets to applicable targets', async () => {
    const setCalls: string[] = [];
    const { engine, supabaseTarget, vercelTarget, githubTarget } = buildEngine();

    supabaseTarget.setSecret = async (key: string) => { setCalls.push(`supabase:${key}`); };
    vercelTarget.setSecret = async (key: string) => { setCalls.push(`vercel:${key}`); };
    githubTarget.setSecret = async (key: string) => { setCalls.push(`github:${key}`); };

    const report = await engine.syncAll();

    expect(report.synced).toBeGreaterThan(0);
    expect(setCalls.length).toBeGreaterThan(0);
  });

  it('reports failures without throwing', async () => {
    const { engine, githubTarget } = buildEngine();
    githubTarget.setSecret = async () => {
      throw new Error('GitHub API rate limit');
    };

    const report = await engine.syncAll();
    expect(report.failed).toBeGreaterThan(0);
    const failedRow = report.rows.find((r: { results: Array<{ success: boolean; error?: string }> }) =>
      r.results.some((res: { success: boolean; error?: string }) => !res.success && res.error?.includes('rate limit')),
    );
    expect(failedRow).toBeDefined();
  });

  it('skips secrets with empty vault values', async () => {
    const { engine } = buildEngine({ secrets: { RESEND_CCC_SEND: 're_key' } });
    const report = await engine.syncAll();

    expect(report.skipped).toBeGreaterThan(0);
  });
});
