import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const config: StorybookConfig = {
  stories: [
    '../../web/src/**/*.stories.@(ts|tsx)',
    '../../../packages/*/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss());

    const root = resolve(__dirname, '../../..');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@compass/compass': resolve(root, 'packages/compass/src/index.ts'),
      '@compass/scoring': resolve(root, 'packages/scoring/src/index.ts'),
      '@compass/tokens': resolve(root, 'packages/tokens/src/index.ts'),
      '@compass/types': resolve(root, 'packages/types/src/index.ts'),
      '@compass/ui': resolve(root, 'packages/ui/src/index.ts'),
      '@compass/utils': resolve(root, 'packages/utils/src/index.ts'),
      // Ensure @storybook/test resolves for stories outside the storybook workspace
      '@storybook/test': resolve(__dirname, '../node_modules/@storybook/test'),
      // Single instance of TanStack Router so decorator context matches component context
      '@tanstack/react-router': dirname(createRequire(resolve(root, 'apps/web/package.json')).resolve('@tanstack/react-router/package.json')),
    };

    config.build = config.build || {};
    config.build.chunkSizeWarningLimit = 1000;

    return config;
  },
};

export default config;
