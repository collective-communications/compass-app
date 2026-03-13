import { VercelAdapter } from './adapter.js';
import { registerFrontendRoutes } from './routes.js';
import type {
  ProviderPluginFactory,
  ProviderPlugin,
  SecretMapping,
} from '../../src/types/plugin.js';

/** Creates the Vercel provider plugin factory. */
export function createVercelPlugin(): ProviderPluginFactory {
  return ({ secrets, vaultClient, getSecret }): ProviderPlugin => {
    const adapter = new VercelAdapter({
      token: secrets.get('VERCEL_TOKEN') ?? '',
      projectId: secrets.get('VERCEL_PROJECT_ID') ?? '',
      orgId: secrets.get('VERCEL_ORG_ID'),
      resolve: {
        token: () => getSecret('VERCEL_TOKEN'),
        projectId: () => getSecret('VERCEL_PROJECT_ID'),
        orgId: () => getSecret('VERCEL_ORG_ID'),
      },
    });

    const secretMappings: SecretMapping[] = [
      { vaultKey: 'VITE_SUPABASE_URL' },
      { vaultKey: 'VITE_SUPABASE_ANON_KEY' },
      { vaultKey: 'SUPABASE_URL' },
      { vaultKey: 'SUPABASE_SERVICE_ROLE_KEY' },
      { vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_API_KEY' },
      { vaultKey: 'RESEND_FROM_ADDRESS' },
      { vaultKey: 'OPENAI_API_KEY' },
      { vaultKey: 'VITE_APP_URL' },
      { vaultKey: 'APP_URL' },
    ];

    return {
      id: 'vercel',
      displayName: 'Vercel',
      adapter,
      secretMappings,

      syncTarget: {
        verifiable: true,
        async setSecret(key: string, value: string): Promise<void> {
          await adapter.setEnvVar(key, value);
        },
        async getSecrets(): Promise<Map<string, string>> {
          const envVars = await adapter.getEnvVars();
          const map = new Map<string, string>();
          for (const env of envVars) {
            map.set(env.key, env.value ?? '');
          }
          return map;
        },
      },

      deploySteps: [
        {
          id: 'vercel:triggerBuild',
          label: 'Trigger Vercel build',
          provider: 'vercel',
          order: 300,
          async execute(): Promise<string> {
            const current = await adapter.getCurrentDeployment();
            if (!current) {
              throw new Error('No current deployment to redeploy');
            }
            const uid = await adapter.triggerRedeploy(current.uid);
            return `Triggered build ${uid}`;
          },
        },
        {
          id: 'vercel:waitForBuild',
          label: 'Wait for Vercel build',
          provider: 'vercel',
          order: 400,
          async execute(): Promise<string> {
            const deployments = await adapter.getDeployments(1);
            const latest = deployments[0];
            if (!latest) {
              throw new Error('No deployment found to poll');
            }
            const result = await adapter.pollDeployment(latest.uid);
            return `Build ${result.uid} finished with status ${result.status}`;
          },
        },
      ],

      screen: {
        label: 'Frontend',
        path: '/frontend',
        modulePath: 'provider-screens/frontend.js',
      },

      registerRoutes(router, ctx): void {
        registerFrontendRoutes(router, adapter, ctx.syncEngine, ctx.vaultClient);
      },
    };
  };
}
