import { SupabaseAdapter } from './adapter.js';
import type { SupabaseAdapterConfig } from './adapter.js';
import type { DetailSection, ProviderPluginFactory } from '../../src/types/plugin.js';
import { jsonSuccess, jsonError } from '../../src/api/router.js';
import { registerDatabaseRoutes } from './routes.js';

export type { SupabaseAdapterConfig };
export { SupabaseAdapter };

/** Extract the project ref from a Supabase URL (e.g. https://abcdef.supabase.co → abcdef). */
function extractProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const ref = hostname.split('.')[0];
    return ref ?? '';
  } catch {
    return '';
  }
}

export function createSupabasePlugin(
  config?: { projectRoot?: string },
): ProviderPluginFactory {
  return ({ secrets, getSecret }) => {
    const supabaseUrl = secrets.get('SUPABASE_URL') ?? '';
    const projectRef = extractProjectRef(supabaseUrl);

    const adapter = new SupabaseAdapter({
      projectRef,
      accessToken: secrets.get('SUPABASE_ACCESS_TOKEN') ?? '',
      serviceRoleKey: secrets.get('SUPABASE_SERVICE_ROLE_KEY'),
      supabaseUrl,
      projectRoot: config?.projectRoot,
      resolve: {
        accessToken: () => getSecret('SUPABASE_ACCESS_TOKEN'),
        projectRef: async () => {
          const url = await getSecret('SUPABASE_URL');
          return extractProjectRef(url);
        },
        serviceRoleKey: () => getSecret('SUPABASE_SERVICE_ROLE_KEY'),
        supabaseUrl: () => getSecret('SUPABASE_URL'),
      },
    });

    return {
      id: 'supabase',
      displayName: 'Supabase',
      adapter,

      secretMappings: [
        { vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_API_KEY' },
        { vaultKey: 'RESEND_FROM_ADDRESS' },
        { vaultKey: 'OPENAI_API_KEY' },
        { vaultKey: 'APP_URL' },
        // OAuth provider credentials flow through the `configureOAuthProviders`
        // deploy step (not the function-secrets sync path) because they set
        // project-level auth config, not edge-function env vars. Listing them
        // here so the sync dashboard shows their vault presence.
        { vaultKey: 'GOOGLE_OAUTH_CLIENT_ID' },
        { vaultKey: 'GOOGLE_OAUTH_CLIENT_SECRET' },
        { vaultKey: 'AZURE_OAUTH_CLIENT_ID' },
        { vaultKey: 'AZURE_OAUTH_CLIENT_SECRET' },
        { vaultKey: 'AZURE_OAUTH_TENANT' },
      ],

      syncTarget: {
        verifiable: false,
        async setSecret(key: string, value: string): Promise<void> {
          await adapter.setSecrets({ [key]: value });
        },
      },

      deploySteps: [
        {
          id: 'pushMigrations',
          label: 'Push database migrations',
          provider: 'supabase',
          order: 100,
          execute: async () => {
            const result = await adapter.pushMigrations();
            if (result.errors.length > 0) {
              throw new Error(result.errors.join('\n'));
            }
            return `Applied ${result.applied.length} migration(s)`;
          },
        },
        {
          id: 'deployFunctions',
          label: 'Deploy edge functions',
          provider: 'supabase',
          order: 200,
          execute: async () => {
            const result = await adapter.deployAllFunctions();
            if (result.failed.length > 0) {
              const msgs = result.failed.map((f) => `${f.name}: ${f.error}`);
              throw new Error(msgs.join('\n'));
            }
            return `Deployed ${result.deployed.length} function(s)`;
          },
        },
        {
          id: 'configureAuth',
          label: 'Configure auth redirect URLs',
          provider: 'supabase',
          order: 300,
          execute: async () => {
            const appUrl = await getSecret('APP_URL');
            if (!appUrl) {
              return 'Skipped — APP_URL not set in vault';
            }

            // Set site_url for email links (this is the prod/canonical URL;
            // dev URLs go in the allow-list only, not site_url).
            await adapter.updateAuthConfig({ site_url: appUrl });

            // Every destination Supabase Auth may redirect back to must be in
            // the allow-list — both production and any dev URLs that hit the
            // same Supabase project. Supabase's uri_allow_list supports N
            // entries, so we push for each known base URL.
            const redirectPaths = [
              '/auth/callback',       // OAuth + magic-link return
              '/auth/reset-password', // Password recovery email link
            ];

            const baseUrls = [appUrl];
            const devAppUrl = await getSecret('DEV_APP_URL');
            if (devAppUrl && devAppUrl !== appUrl) {
              baseUrls.push(devAppUrl);
            }

            const redirectUrls = baseUrls.flatMap((base) =>
              redirectPaths.map((p) => `${base}${p}`),
            );

            let lastTotal = 0;
            const added: string[] = [];
            const existing: string[] = [];
            for (const url of redirectUrls) {
              const result = await adapter.addRedirectUrl(url);
              lastTotal = result.allowList.length;
              (result.added ? added : existing).push(url);
            }

            const parts = [`Set site_url=${appUrl}`];
            if (added.length > 0) {
              parts.push(`added ${added.length} URL(s) to redirect allow-list: ${added.join(', ')}`);
            }
            if (existing.length > 0) {
              parts.push(`${existing.length} already present`);
            }
            parts.push(`(${lastTotal} total)`);
            return parts.join(', ');
          },
        },
        {
          id: 'configureOAuthProviders',
          label: 'Configure OAuth providers (Google, Microsoft)',
          provider: 'supabase',
          order: 400,
          execute: syncOAuthProviders,
        },
      ],

      screen: {
        label: 'Database',
        path: '/database',
        modulePath: 'provider-screens/database.js',
        detailSections: buildSupabaseDetailSections,
      },

      registerRoutes(router) {
        registerDatabaseRoutes(router, adapter);

        // On-demand OAuth sync from the dashboard without running the full
        // deploy. Same logic as the `configureOAuthProviders` deploy step.
        router.post('/api/database/auth/oauth/sync', async () => {
          try {
            const detail = await syncOAuthProviders();
            return jsonSuccess({ detail });
          } catch (err) {
            return jsonError(err instanceof Error ? err.message : String(err), 500);
          }
        });
      },
    };

    /**
     * Build Deploy-screen detail sections from live adapter data. Each
     * adapter call is isolated — a failure skips that section rather than
     * taking down the whole response. Returns an empty array when the
     * adapter is not yet configured (no project ref).
     */
    async function buildSupabaseDetailSections(): Promise<DetailSection[]> {
      let accessToken = '';
      try {
        accessToken = await getSecret('SUPABASE_ACCESS_TOKEN');
      } catch {
        // Vault offline/locked — treat as not configured.
      }
      if (!accessToken) {
        return [];
      }

      const sections: DetailSection[] = [];

      // 1. Connection (kv) — derived from healthCheck details.
      try {
        const health = await adapter.healthCheck();
        const details = (health.details ?? {}) as Record<string, string>;
        sections.push({
          kind: 'kv',
          title: 'Connection',
          items: [
            { label: 'Project Ref', value: details.projectRef || null },
            { label: 'Region', value: details.region || null },
            { label: 'DB Version', value: details.version || null },
          ],
        });
      } catch (err) {
        console.warn('[supabase.detailSections] connection skipped:', err);
      }

      // 2. Migrations (progress) — local files only; status field tells us
      // whether they've been applied. Adapter does not return a pushed-count
      // diff against remote, so we report total and use applied count as
      // current.
      try {
        const migrations = await adapter.getMigrations();
        const applied = migrations.filter((m) => m.status === 'applied').length;
        const latest = migrations[migrations.length - 1]?.filename;
        sections.push({
          kind: 'progress',
          title: 'Migrations',
          current: applied,
          total: migrations.length,
          meta: latest ? `Latest: ${latest}` : undefined,
        });
      } catch (err) {
        console.warn('[supabase.detailSections] migrations skipped:', err);
      }

      // 3. Edge Functions (list) — name + deploy status.
      try {
        const functions = await adapter.getEdgeFunctions();
        sections.push({
          kind: 'list',
          title: 'Edge Functions',
          items: functions.map((fn) => ({
            label: fn.name,
            meta: fn.deployed ? 'deployed' : 'undeployed',
            status: fn.deployed ? 'healthy' : 'warning',
          })),
        });
      } catch (err) {
        console.warn('[supabase.detailSections] functions skipped:', err);
      }

      // 4. Extensions (kv) — pgvector only.
      try {
        const pgvector = await adapter.getExtensionStatus('vector');
        sections.push({
          kind: 'kv',
          title: 'Extensions',
          items: [
            {
              label: 'pgvector',
              value: pgvector.installed
                ? `enabled${pgvector.version ? ` (${pgvector.version})` : ''}`
                : pgvector.version
                ? `available (${pgvector.version})`
                : 'unavailable',
            },
          ],
        });
      } catch (err) {
        console.warn('[supabase.detailSections] extensions skipped:', err);
      }

      return sections;
    }

    /**
     * Read OAuth credentials from the vault and push the configured
     * provider(s) into the Supabase Auth config. Shared by the deploy step
     * and the on-demand route.
     *
     * @returns A human-readable detail string — what was configured, or a
     *   "skipped" message when no credentials are present.
     */
    async function syncOAuthProviders(): Promise<string> {
      const [
        googleClientId,
        googleSecret,
        azureClientId,
        azureSecret,
        azureTenantRaw,
      ] = await Promise.all([
        getSecret('GOOGLE_OAUTH_CLIENT_ID'),
        getSecret('GOOGLE_OAUTH_CLIENT_SECRET'),
        getSecret('AZURE_OAUTH_CLIENT_ID'),
        getSecret('AZURE_OAUTH_CLIENT_SECRET'),
        getSecret('AZURE_OAUTH_TENANT'),
      ]);

      const azureTenant = (azureTenantRaw || 'common').trim();
      const updates: Parameters<typeof adapter.updateAuthConfig>[0] = {};
      const configured: string[] = [];

      if (googleClientId && googleSecret) {
        updates.external_google_enabled = true;
        updates.external_google_client_id = googleClientId;
        updates.external_google_secret = googleSecret;
        configured.push('Google');
      }

      if (azureClientId && azureSecret) {
        updates.external_azure_enabled = true;
        updates.external_azure_client_id = azureClientId;
        updates.external_azure_secret = azureSecret;
        updates.external_azure_url = `https://login.microsoftonline.com/${azureTenant}/v2.0`;
        configured.push(`Microsoft (${azureTenant === 'common' ? 'multi-tenant' : azureTenant})`);
      }

      if (configured.length === 0) {
        return 'Skipped — no OAuth provider credentials in vault';
      }

      await adapter.updateAuthConfig(updates);
      return `Configured ${configured.join(' + ')}`;
    }
  };
}
