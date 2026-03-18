import { defineConfig } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './visual-tests',
  testMatch: '**/*.visual.ts',
  snapshotDir: './__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{arg}--{projectName}{ext}',
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:6006',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'mobile',
      use: { viewport: { width: 375, height: 812 } },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'bunx http-server ./storybook-static --port 6006 --silent',
    port: 6006,
    reuseExistingServer: true,
    cwd: __dirname,
  },
});
