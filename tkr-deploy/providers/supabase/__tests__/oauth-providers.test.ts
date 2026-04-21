/**
 * Unit tests for the `configureOAuthProviders` deploy step and the
 * shared `syncOAuthProviders` closure that backs both it and the
 * `/api/database/auth/oauth/sync` route.
 *
 * We exercise the step at the plugin-factory level — constructing a full
 * plugin with a MockVaultClient + a stubbed adapter that records every
 * `updateAuthConfig` call. No network.
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createSupabasePlugin } from '../index.js';
import type { PluginFactoryContext } from '../../../src/types/plugin.js';
import { MockVaultClient } from '../../../src/__tests__/helpers/mock-vault-client.js';

type AuthConfigPayload = Parameters<import('../adapter.js').SupabaseAdapter['updateAuthConfig']>[0];

const updateAuthConfigCalls: AuthConfigPayload[] = [];

beforeEach(() => {
  updateAuthConfigCalls.length = 0;
});

// Stub the entire adapter module so the plugin factory gets our spy, not a
// real Supabase CLI / Management-API call path.
mock.module('../adapter.js', () => ({
  SupabaseAdapter: class {
    async updateAuthConfig(config: AuthConfigPayload): Promise<void> {
      updateAuthConfigCalls.push(config);
    }
    async addRedirectUrl(): Promise<{ added: boolean; allowList: string[] }> {
      return { added: false, allowList: [] };
    }
    async setSecrets(): Promise<void> {}
    async pushMigrations(): Promise<{ applied: string[]; errors: string[] }> {
      return { applied: [], errors: [] };
    }
    async deployAllFunctions(): Promise<{ deployed: string[]; failed: Array<{ name: string; error: string }> }> {
      return { deployed: [], failed: [] };
    }
  },
}));

/**
 * Build a factory context mirroring production: the vault seed defines every
 * OAuth key up front (possibly with empty values), so `getSecret` never
 * rejects with "Secret not found". The caller can override individual keys.
 */
function buildFactoryContext(overrides: Record<string, string>): PluginFactoryContext {
  const secrets: Record<string, string> = {
    SUPABASE_URL: 'https://test.supabase.co',
    GOOGLE_OAUTH_CLIENT_ID: '',
    GOOGLE_OAUTH_CLIENT_SECRET: '',
    AZURE_OAUTH_CLIENT_ID: '',
    AZURE_OAUTH_CLIENT_SECRET: '',
    AZURE_OAUTH_TENANT: '',
    ...overrides,
  };
  const vault = new MockVaultClient({ secrets });
  return {
    secrets: new Map(Object.entries(secrets)),
    vaultClient: vault,
    getSecret: (name) => vault.getSecret(name),
  };
}

function findOAuthStep(plugin: ReturnType<ReturnType<typeof createSupabasePlugin>>) {
  const step = plugin.deploySteps.find((s) => s.id === 'configureOAuthProviders');
  if (!step) throw new Error('configureOAuthProviders step not registered');
  return step;
}

describe('supabase plugin — configureOAuthProviders deploy step', () => {
  it('skips cleanly when no OAuth credentials are in the vault', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toMatch(/skipped/i);
    expect(updateAuthConfigCalls).toHaveLength(0);
  });

  it('configures Google alone when only Google credentials are set', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
      GOOGLE_OAUTH_CLIENT_ID: 'google-client-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret',
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toContain('Google');
    expect(detail).not.toContain('Microsoft');
    expect(updateAuthConfigCalls).toHaveLength(1);
    expect(updateAuthConfigCalls[0]).toEqual({
      external_google_enabled: true,
      external_google_client_id: 'google-client-id',
      external_google_secret: 'google-secret',
    });
  });

  it('configures Microsoft with default multi-tenant URL when AZURE_OAUTH_TENANT is empty', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
      AZURE_OAUTH_CLIENT_ID: 'azure-client-id',
      AZURE_OAUTH_CLIENT_SECRET: 'azure-secret',
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toContain('Microsoft (multi-tenant)');
    expect(updateAuthConfigCalls).toHaveLength(1);
    expect(updateAuthConfigCalls[0]).toEqual({
      external_azure_enabled: true,
      external_azure_client_id: 'azure-client-id',
      external_azure_secret: 'azure-secret',
      external_azure_url: 'https://login.microsoftonline.com/common/v2.0',
    });
  });

  it('uses the tenant GUID when AZURE_OAUTH_TENANT is set', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
      AZURE_OAUTH_CLIENT_ID: 'azure-client-id',
      AZURE_OAUTH_CLIENT_SECRET: 'azure-secret',
      AZURE_OAUTH_TENANT: '00000000-1111-2222-3333-444444444444',
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toContain('Microsoft (00000000-1111-2222-3333-444444444444)');
    expect(updateAuthConfigCalls[0]?.external_azure_url).toBe(
      'https://login.microsoftonline.com/00000000-1111-2222-3333-444444444444/v2.0',
    );
  });

  it('configures both providers in a single PATCH call when both are set', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
      GOOGLE_OAUTH_CLIENT_ID: 'g-id',
      GOOGLE_OAUTH_CLIENT_SECRET: 'g-secret',
      AZURE_OAUTH_CLIENT_ID: 'a-id',
      AZURE_OAUTH_CLIENT_SECRET: 'a-secret',
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toContain('Google');
    expect(detail).toContain('Microsoft');
    expect(updateAuthConfigCalls).toHaveLength(1);
    expect(updateAuthConfigCalls[0]).toEqual({
      external_google_enabled: true,
      external_google_client_id: 'g-id',
      external_google_secret: 'g-secret',
      external_azure_enabled: true,
      external_azure_client_id: 'a-id',
      external_azure_secret: 'a-secret',
      external_azure_url: 'https://login.microsoftonline.com/common/v2.0',
    });
  });

  it('skips a provider when only one half of the credential pair is set', async () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
      GOOGLE_OAUTH_CLIENT_ID: 'only-id',
      // no GOOGLE_OAUTH_CLIENT_SECRET
    }));
    const detail = await findOAuthStep(plugin).execute();

    expect(detail).toMatch(/skipped/i);
    expect(updateAuthConfigCalls).toHaveLength(0);
  });
});

describe('supabase plugin — OAuth vault secret mappings', () => {
  it('exposes the five OAuth vault keys so the sync dashboard shows them', () => {
    const plugin = createSupabasePlugin()(buildFactoryContext({
    }));
    const vaultKeys = plugin.secretMappings.map((m) => m.vaultKey);
    expect(vaultKeys).toContain('GOOGLE_OAUTH_CLIENT_ID');
    expect(vaultKeys).toContain('GOOGLE_OAUTH_CLIENT_SECRET');
    expect(vaultKeys).toContain('AZURE_OAUTH_CLIENT_ID');
    expect(vaultKeys).toContain('AZURE_OAUTH_CLIENT_SECRET');
    expect(vaultKeys).toContain('AZURE_OAUTH_TENANT');
  });
});
