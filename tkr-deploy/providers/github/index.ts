import { GitHubAdapter } from './adapter.js';
import { registerCicdRoutes } from './routes.js';
import type { ProviderPluginFactory } from '../../src/types/plugin.js';

export function createGitHubPlugin(): ProviderPluginFactory {
  return ({ secrets, vaultClient, getSecret }) => {
    const adapter = new GitHubAdapter({
      token: secrets.get('GITHUB_TOKEN') ?? '',
      owner: secrets.get('GITHUB_OWNER') ?? '',
      repo: secrets.get('GITHUB_REPO') ?? '',
      resolve: {
        token: () => getSecret('GITHUB_TOKEN'),
      },
    });

    return {
      id: 'github',
      displayName: 'GitHub',
      adapter,
      secretMappings: [
        { vaultKey: 'VITE_SUPABASE_URL' },
        { vaultKey: 'VITE_SUPABASE_ANON_KEY' },
        { vaultKey: 'SUPABASE_URL' },
        { vaultKey: 'SUPABASE_SERVICE_ROLE_KEY' },
        { vaultKey: 'SUPABASE_ACCESS_TOKEN' },
        { vaultKey: 'SUPABASE_PROJECT_REF' },
        { vaultKey: 'SUPABASE_DB_PASSWORD' },
        { vaultKey: 'VERCEL_TOKEN' },
        { vaultKey: 'VERCEL_ORG_ID' },
        { vaultKey: 'VERCEL_PROJECT_ID' },
        { vaultKey: 'RESEND_CCC_SEND' },
        { vaultKey: 'OPENAI_API_KEY' },
        { vaultKey: 'E2E_SUPABASE_URL' },
        { vaultKey: 'E2E_SUPABASE_SERVICE_KEY' },
      ],
      syncTarget: {
        setSecret: (key, value) => adapter.setSecret(key, value),
        listSecrets: () => adapter.listSecrets(),
        verifiable: false,
      },
      deploySteps: [],
      screen: {
        label: 'CI/CD',
        path: '/cicd',
        modulePath: 'provider-screens/cicd.js',
      },
      registerRoutes(router, ctx) {
        registerCicdRoutes(router, adapter, ctx.syncEngine, ctx.vaultClient);
      },
    };
  };
}
