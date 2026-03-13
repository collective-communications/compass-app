import { SupabaseAdapter } from './adapter.js';
import type { SupabaseAdapterConfig } from './adapter.js';
import type { ProviderPluginFactory } from '../../src/types/plugin.js';
import { registerDatabaseRoutes } from './routes.js';

export type { SupabaseAdapterConfig };
export { SupabaseAdapter };

export function createSupabasePlugin(
  config?: { projectRoot?: string },
): ProviderPluginFactory {
  return ({ secrets, getSecret }) => {
    const adapter = new SupabaseAdapter({
      projectRef: secrets.get('SUPABASE_PROJECT_REF') ?? '',
      accessToken: secrets.get('SUPABASE_ACCESS_TOKEN') ?? '',
      serviceRoleKey: secrets.get('SUPABASE_SERVICE_ROLE_KEY'),
      supabaseUrl: secrets.get('SUPABASE_URL'),
      projectRoot: config?.projectRoot,
      resolve: {
        accessToken: () => getSecret('SUPABASE_ACCESS_TOKEN'),
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
