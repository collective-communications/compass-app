import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.e2e.local if present. This mirrors playwright.config.ts, but this
// config intentionally omits the SPA web server because security specs probe
// Supabase and edge functions directly.
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
  testDir: './tests/security',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 1,
  reporter: isCI ? [['blob', { outputDir: 'blob-report-security' }]] : 'list',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './global-setup.ts',

  projects: [
    {
      name: 'security-api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
