import { SupabaseAdapter } from './adapter.js';
import type { SupabaseAdapterConfig } from './adapter.js';
import type { ProviderPluginFactory } from '../../src/types/plugin.js';
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

            // Set site_url for email links
            await adapter.updateAuthConfig({ site_url: appUrl });

            // Ensure callback URL is in the allow-list
            const callbackUrl = `${appUrl}/auth/callback`;
            const { added, allowList } = await adapter.addRedirectUrl(callbackUrl);

            if (added) {
              return `Set site_url=${appUrl}, added ${callbackUrl} to redirect allow-list (${allowList.length} total)`;
            }
            return `Set site_url=${appUrl}, redirect ${callbackUrl} already in allow-list`;
          },
        },
      ],

      screen: {
        label: 'Database',
        path: '/database',
        modulePath: 'provider-screens/database.js',
      },

      registerRoutes(router) {
        registerDatabaseRoutes(router, adapter);
      },
    };
  };
}
