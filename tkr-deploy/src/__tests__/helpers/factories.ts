import type { MigrationEntry, EdgeFunction } from '../../../providers/supabase/types.js';
import type { DeploymentEntry } from '../../../providers/vercel/types.js';
import type { DnsRecord } from '../../../providers/resend/types.js';
import type { ProviderHealth } from '../../types/provider.js';
import type { SecretSyncRow } from '../../core/secrets-sync-engine.js';

const FIXED_TS = '2026-03-01T00:00:00.000Z';

/** Creates a valid MigrationEntry with sensible defaults. */
export function createMigrationEntry(overrides?: Partial<MigrationEntry>): MigrationEntry {
  return {
    filename: '20260301000000_init.sql',
    status: 'applied',
    appliedAt: FIXED_TS,
    ...overrides,
  };
}

/** Creates a valid EdgeFunction with sensible defaults. */
export function createEdgeFunction(overrides?: Partial<EdgeFunction>): EdgeFunction {
  return {
    name: 'send-report-email',
    deployed: true,
    lastDeployed: FIXED_TS,
    requiredSecrets: ['RESEND_API_KEY'],
    ...overrides,
  };
}

/** Creates a valid DeploymentEntry with sensible defaults. */
export function createDeploymentEntry(overrides?: Partial<DeploymentEntry>): DeploymentEntry {
  return {
    uid: 'dpl_abc123',
    commitSha: 'a1b2c3d4e5f6',
    commitMessage: 'feat: initial deploy',
    branch: 'main',
    target: 'production',
    status: 'READY',
    duration: 45000,
    createdAt: FIXED_TS,
    ...overrides,
  };
}

/** Creates a valid DnsRecord with sensible defaults. */
export function createDnsRecord(overrides?: Partial<DnsRecord>): DnsRecord {
  return {
    type: 'TXT',
    name: '_dmarc.example.com',
    value: 'v=DMARC1; p=none',
    status: 'verified',
    ...overrides,
  };
}

/** Creates a valid ProviderHealth with sensible defaults. */
export function createProviderHealth(overrides?: Partial<ProviderHealth>): ProviderHealth {
  return {
    provider: 'supabase',
    status: 'healthy',
    label: 'Supabase',
    details: {},
    checkedAt: new Date(FIXED_TS).getTime(),
    ...overrides,
  };
}

/** Creates a valid SecretSyncRow with sensible defaults. */
export function createSecretSyncRow(overrides?: Partial<SecretSyncRow>): SecretSyncRow {
  return {
    name: 'RESEND_API_KEY',
    vaultValueHash: 'abc123',
    targets: {
      supabase: { state: 'synced' },
      vercel: { state: 'synced' },
      github: { state: 'synced' },
    },
    ...overrides,
  };
}
