/**
 * One-shot invocation of the tkr-deploy `configureAuth` step.
 *
 * Reads SUPABASE_ACCESS_TOKEN, SUPABASE_URL, APP_URL, DEV_APP_URL from the
 * unlocked `compass` vault (tkr-secrets at VAULT_URL) and pushes the app's
 * redirect URLs into Supabase Auth's `uri_allow_list` via the Management API.
 *
 * Idempotent: URLs already present are skipped. Use this to unblock local E2E
 * tests that depend on a specific redirect URL (e.g. /auth/reset-password)
 * without running the full tkr-deploy UI.
 *
 * Run: `bun scripts/run-configure-auth.ts`
 */

import { VaultHttpClient } from '../tkr-deploy/src/adapters/vault-client.js';
import { SupabaseAdapter } from '../tkr-deploy/providers/supabase/adapter.js';

const VAULT_URL = process.env.VAULT_URL ?? 'http://localhost:42042';
const VAULT_NAME = process.env.VAULT_NAME ?? 'compass';

function extractProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0] ?? '';
  } catch {
    return '';
  }
}

async function main(): Promise<void> {
  const vault = new VaultHttpClient({ baseUrl: VAULT_URL, vaultName: VAULT_NAME });

  const health = await vault.health();
  if (!health.connected) {
    throw new Error(`Vault ${VAULT_NAME} at ${VAULT_URL} is not reachable`);
  }
  if (health.locked) {
    throw new Error(`Vault ${VAULT_NAME} is locked — unlock it in tkr-secrets first`);
  }

  const [accessToken, supabaseUrl, appUrl, devAppUrl] = await Promise.all([
    vault.getSecret('SUPABASE_ACCESS_TOKEN'),
    vault.getSecret('SUPABASE_URL'),
    vault.getSecret('APP_URL'),
    vault.getSecret('DEV_APP_URL'),
  ]);

  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN missing from vault');
  if (!supabaseUrl) throw new Error('SUPABASE_URL missing from vault');
  if (!appUrl) throw new Error('APP_URL missing from vault');

  const projectRef = extractProjectRef(supabaseUrl);
  if (!projectRef) throw new Error(`Could not extract project ref from SUPABASE_URL="${supabaseUrl}"`);

  const adapter = new SupabaseAdapter({ projectRef, accessToken, supabaseUrl });

  console.log(`[configure-auth] project=${projectRef} site_url=${appUrl}`);
  await adapter.updateAuthConfig({ site_url: appUrl });

  const redirectPaths = ['/auth/callback', '/auth/reset-password'];
  const baseUrls = [appUrl];
  if (devAppUrl && devAppUrl !== appUrl) {
    baseUrls.push(devAppUrl);
    console.log(`[configure-auth] dev_app_url=${devAppUrl} (additional)`);
  }
  const redirectUrls = baseUrls.flatMap((base) => redirectPaths.map((p) => `${base}${p}`));

  for (const url of redirectUrls) {
    const { added, allowList } = await adapter.addRedirectUrl(url);
    console.log(`[configure-auth] ${added ? 'ADD ' : 'skip'} ${url}  (list size: ${allowList.length})`);
  }

  console.log('[configure-auth] done');
}

main().catch((err) => {
  console.error(`[configure-auth] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
