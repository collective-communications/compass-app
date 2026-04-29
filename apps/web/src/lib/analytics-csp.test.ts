import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('analytics CSP', () => {
  test('allows first-party Supabase capture and no third-party analytics domains', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: Array<{ headers: Array<{ key: string; value: string }> }>;
    };

    const csp = config.headers
      .flatMap((entry) => entry.headers)
      .find((header) => header.key === 'Content-Security-Policy')?.value;

    expect(csp).toBeTruthy();
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(csp).not.toContain('google-analytics.com');
    expect(csp).not.toContain('googletagmanager.com');
    expect(csp).not.toContain('plausible.io');
    expect(csp).not.toContain('posthog.com');
    expect(csp).not.toContain('segment.com');
  });
});
