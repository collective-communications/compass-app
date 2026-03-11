import type { ProviderHealth } from '../../types/provider.js';
import type { MigrationEntry, EdgeFunction } from '../../types/supabase.js';
import type { DeploymentEntry, VercelEnvVar } from '../../types/vercel.js';
import type { DnsRecord, ApiKeyMeta } from '../../types/resend.js';
import type { WorkflowStatus, WorkflowRun } from '../../types/github.js';
import { createProviderHealth, createDeploymentEntry } from './factories.js';

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export interface MockSupabaseAdapter {
  readonly name: 'supabase';
  healthCheck(): Promise<ProviderHealth>;
  getMigrations(): Promise<MigrationEntry[]>;
  pushMigrations(): Promise<{ applied: string[]; errors: string[] }>;
  getEdgeFunctions(): Promise<EdgeFunction[]>;
  deployFunction(name: string): Promise<void>;
  deployAllFunctions(): Promise<{ deployed: string[]; failed: Array<{ name: string; error: string }> }>;
  setSecrets(secrets: Record<string, string>): Promise<void>;
}

export function createMockSupabaseAdapter(
  overrides?: Partial<MockSupabaseAdapter>,
): MockSupabaseAdapter {
  return {
    name: 'supabase',
    healthCheck: async () => createProviderHealth({ provider: 'supabase', label: 'Supabase' }),
    getMigrations: async () => [],
    pushMigrations: async () => ({ applied: [], errors: [] }),
    getEdgeFunctions: async () => [],
    deployFunction: async () => {},
    deployAllFunctions: async () => ({ deployed: [], failed: [] }),
    setSecrets: async () => {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Vercel
// ---------------------------------------------------------------------------

export interface MockVercelAdapter {
  readonly name: 'vercel';
  healthCheck(): Promise<ProviderHealth>;
  getDeployments(limit?: number): Promise<DeploymentEntry[]>;
  getCurrentDeployment(): Promise<DeploymentEntry | null>;
  getEnvVars(): Promise<VercelEnvVar[]>;
  setEnvVar(key: string, value: string): Promise<void>;
  triggerRedeploy(deploymentId: string): Promise<string>;
  pollDeployment(uid: string): Promise<DeploymentEntry>;
}

export function createMockVercelAdapter(
  overrides?: Partial<MockVercelAdapter>,
): MockVercelAdapter {
  return {
    name: 'vercel',
    healthCheck: async () => createProviderHealth({ provider: 'vercel', label: 'Vercel' }),
    getDeployments: async () => [],
    getCurrentDeployment: async () => createDeploymentEntry(),
    getEnvVars: async () => [],
    setEnvVar: async () => {},
    triggerRedeploy: async () => 'dpl_new123',
    pollDeployment: async () => createDeploymentEntry({ status: 'READY' }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

export interface MockResendAdapter {
  readonly name: 'resend';
  healthCheck(): Promise<ProviderHealth>;
  getDomains(): Promise<Array<{ id: string; name: string; status: string }>>;
  getApiKeys(): Promise<ApiKeyMeta[]>;
}

export function createMockResendAdapter(
  overrides?: Partial<MockResendAdapter>,
): MockResendAdapter {
  return {
    name: 'resend',
    healthCheck: async () => createProviderHealth({ provider: 'resend', label: 'Resend' }),
    getDomains: async () => [],
    getApiKeys: async () => [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export interface MockGitHubAdapter {
  readonly name: 'github';
  healthCheck(): Promise<ProviderHealth>;
  getWorkflows(): Promise<WorkflowStatus[]>;
  getRecentRuns(limit?: number): Promise<WorkflowRun[]>;
  listSecrets(): Promise<string[]>;
  setSecret(name: string, value: string): Promise<void>;
}

export function createMockGitHubAdapter(
  overrides?: Partial<MockGitHubAdapter>,
): MockGitHubAdapter {
  return {
    name: 'github',
    healthCheck: async () => createProviderHealth({ provider: 'github', label: 'GitHub' }),
    getWorkflows: async () => [],
    getRecentRuns: async () => [],
    listSecrets: async () => [],
    setSecret: async () => {},
    ...overrides,
  };
}
