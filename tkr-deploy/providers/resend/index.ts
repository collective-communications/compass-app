import { ResendAdapter } from './adapter.js';
import { registerEmailRoutes } from './routes.js';
import type { ProviderPluginFactory } from '../../src/types/plugin.js';

export interface ResendPluginConfig {
  /** Vault key name for the Resend admin API key. */
  apiKeySecret?: string;
}

export function createResendPlugin(
  config: ResendPluginConfig = {},
): ProviderPluginFactory {
  const apiKeySecret = config.apiKeySecret ?? 'RESEND_API_KEY';

  return ({ secrets, getSecret }) => {
    const adapter = new ResendAdapter({
      apiKey: secrets.get(apiKeySecret) ?? '',
      resolve: {
        apiKey: () => getSecret(apiKeySecret),
      },
    });

    return {
      id: 'resend',
      displayName: 'Resend',
      adapter,
      secretMappings: [],
      syncTarget: undefined,
      deploySteps: [],
      screen: {
        label: 'Email',
        path: '/email',
        modulePath: 'provider-screens/email.js',
      },
      registerRoutes(router) {
        registerEmailRoutes(router, adapter);
      },
    };
  };
}
