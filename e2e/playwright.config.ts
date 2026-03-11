import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// Load .env.e2e.local if present (Playwright doesn't have built-in dotenv)
const envPath = resolve(__dirname, '.env.e2e.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './global-setup.ts',

  webServer: {
    command: 'bun run --filter @compass/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 30_000,
    cwd: resolve(__dirname, '..'),
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-survey',
      testDir: './tests/survey',
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup', 'chromium-survey'],
      testIgnore: [/auth\.setup\.ts/, /survey\//],
    },
    ...(isCI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['auth-setup'],
            testIgnore: /auth\.setup\.ts/,
          },
        ]
      : []),
  ],
});
