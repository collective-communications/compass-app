import { describe, it, expect } from 'bun:test';
import { MockVaultClient } from '../helpers/mock-vault-client.js';
import { createMockVercelAdapter, createMockGitHubAdapter, createMockSupabaseAdapter } from '../helpers/mock-adapters.js';
import { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';

function buildEngine(opts?: {
  secrets?: Record<string, string>;
  githubSecrets?: string[];
  vercelEnvVars?: Array<{ key: string; value: string; target: string[]; type: string; id: string }>;
}) {
  const vault = new MockVaultClient({
    secrets: opts?.secrets ?? {
      RESEND_API_KEY: 're_test_key_123',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-abc',
      VERCEL_TOKEN: 'tok_vercel_xyz',
    },
  });

  const supabase = createMockSupabaseAdapter();
  const github = createMockGitHubAdapter({
    listSecrets: async () => opts?.githubSecrets ?? [],
  });
  const vercel = createMockVercelAdapter({
    getEnvVars: async () => opts?.vercelEnvVars ?? [],
  });

  const engine = new SecretsSyncEngine({
    vaultClient: vault,
    adapters: { supabase, vercel, github },
  });

  return { vault, engine, supabase, vercel, github };
}

describe('integration: computeSyncStatus', () => {
  it('returns rows for all mapped secrets', async () => {
    const { engine } = buildEngine();
    const rows = await engine.computeSyncStatus();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.name).toBeDefined();
      expect(row.targets).toBeDefined();
      expect(row.targets.supabase).toBeDefined();
      expect(row.targets.vercel).toBeDefined();
      expect(row.targets.github).toBeDefined();
    }
  });

  it('marks github secrets as synced when present', async () => {
    const { engine } = buildEngine({
      githubSecrets: ['RESEND_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VERCEL_TOKEN'],
    });
    const rows = await engine.computeSyncStatus();

    const resendRow = rows.find((r) => r.name === 'RESEND_API_KEY');
    expect(resendRow).toBeDefined();
    expect(resendRow!.targets.github.state).toBe('synced');
  });

  it('marks github secrets as missing when absent', async () => {
    const { engine } = buildEngine({ githubSecrets: [] });
    const rows = await engine.computeSyncStatus();

    const resendRow = rows.find((r) => r.name === 'RESEND_API_KEY');
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

  it('pushes secrets to all applicable targets', async () => {
    const setCalls: string[] = [];
    const { engine } = buildEngine();
    // Patch adapters to track calls
    (engine as any).adapters.supabase.setSecrets = async (secrets: Record<string, string>) => {
      setCalls.push(...Object.keys(secrets).map((k) => `supabase:${k}`));
    };
    (engine as any).adapters.vercel.setEnvVar = async (key: string) => {
      setCalls.push(`vercel:${key}`);
    };
    (engine as any).adapters.github.setSecret = async (name: string) => {
      setCalls.push(`github:${name}`);
    };

    const report = await engine.syncAll();

    expect(report.synced).toBeGreaterThan(0);
    expect(setCalls.length).toBeGreaterThan(0);
    // RESEND_API_KEY should sync to all three
    expect(setCalls.filter((c) => c.includes('RESEND_API_KEY')).length).toBe(3);
  });

  it('reports failures without throwing', async () => {
    const { engine } = buildEngine();
    (engine as any).adapters.github.setSecret = async () => {
      throw new Error('GitHub API rate limit');
    };

    const report = await engine.syncAll();
    expect(report.failed).toBeGreaterThan(0);
    const failedRow = report.rows.find((r) =>
      r.results.some((res) => !res.success && res.error?.includes('rate limit')),
    );
    expect(failedRow).toBeDefined();
  });

  it('skips secrets with empty vault values', async () => {
    // SUPABASE_DB_PASSWORD is in SECRET_TARGET_MAP but not in vault secrets
    const { engine } = buildEngine({ secrets: { RESEND_API_KEY: 're_key' } });
    const report = await engine.syncAll();

    // Secrets not in vault have empty values, should be skipped
    expect(report.skipped).toBeGreaterThan(0);
  });
});
