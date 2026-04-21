/**
 * One-shot invocation of the tkr-deploy `deployFunction` adapter call.
 *
 * Usage: `bun scripts/run-deploy-function.ts <function-name>`
 *
 * Reads SUPABASE_ACCESS_TOKEN and SUPABASE_URL from the unlocked `compass`
 * vault and shells out to the Supabase CLI (via the adapter) to redeploy
 * the named edge function. The CLI picks up per-function overrides from
 * `supabase/config.toml` (including `verify_jwt`).
 *
 * Use this to apply a `config.toml` change (e.g. flipping `verify_jwt` on
 * a single function) without redeploying the full function set.
 */

import { VaultHttpClient } from '../tkr-deploy/src/adapters/vault-client.js';
import { SupabaseAdapter } from '../tkr-deploy/providers/supabase/adapter.js';

const VAULT_URL = process.env.VAULT_URL ?? 'http://localhost:42042';
const VAULT_NAME = process.env.VAULT_NAME ?? 'compass';

function extractProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0] ?? '';
  } catch {
    return '';
  }
}

async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name) {
    throw new Error('Usage: bun scripts/run-deploy-function.ts <function-name>');
  }

  const vault = new VaultHttpClient({ baseUrl: VAULT_URL, vaultName: VAULT_NAME });
  const health = await vault.health();
  if (!health.connected) throw new Error(`Vault ${VAULT_NAME} at ${VAULT_URL} is not reachable`);
  if (health.locked) throw new Error(`Vault ${VAULT_NAME} is locked`);

  const [accessToken, supabaseUrl] = await Promise.all([
    vault.getSecret('SUPABASE_ACCESS_TOKEN'),
    vault.getSecret('SUPABASE_URL'),
  ]);
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN missing from vault');
  if (!supabaseUrl) throw new Error('SUPABASE_URL missing from vault');

  const projectRef = extractProjectRef(supabaseUrl);
  if (!projectRef) throw new Error(`Could not extract project ref from SUPABASE_URL="${supabaseUrl}"`);

  const adapter = new SupabaseAdapter({ projectRef, accessToken, supabaseUrl });

  console.log(`[deploy-function] project=${projectRef} name=${name}`);
  await adapter.deployFunction(name);
  console.log(`[deploy-function] deployed ${name}`);
}

main().catch((err) => {
  console.error(`[deploy-function] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
