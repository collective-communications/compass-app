// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const _require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: [
    '../../web/src/**/*.stories.@(ts|tsx)',
    '../../../packages/*/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-mcp"),
    resolve(__dirname, 'addons/a11y-report/preset.ts'),
  ],
  features: {
    experimentalComponentsManifest: true,
  },
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
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
      '@compass/tokens/theme.css': resolve(root, 'packages/tokens/src/theme.css'),
      '@compass/tokens': resolve(root, 'packages/tokens/src/index.ts'),
      '@compass/types': resolve(root, 'packages/types/src/index.ts'),
      '@compass/ui': resolve(root, 'packages/ui/src/index.ts'),
      '@compass/utils': resolve(root, 'packages/utils/src/index.ts'),
      // Single instance of TanStack Router so decorator context matches component context
      '@tanstack/react-router': dirname(_require.resolve('@tanstack/react-router/package.json')),
    };

    config.build = config.build || {};
    config.build.chunkSizeWarningLimit = 1000;

    return config;
  },
};

export default config;

function getAbsolutePath(value: string): string {
  return dirname(_require.resolve(join(value, "package.json")));
}
