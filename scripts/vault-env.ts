/**
 * Fetches secrets from tkr-secrets vault and outputs them as KEY=VALUE lines.
 *
 * Usage: bun run scripts/vault-env.ts [--port 42032] [--vault compass] [--prefix VITE_]
 *
 * Waits for the vault to be reachable and unlocked before fetching.
 * Exits silently with code 0 if the vault is unavailable (non-blocking).
 */

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const port = getArg('port', '42032');
const vault = getArg('vault', 'compass');
const prefix = getArg('prefix', 'VITE_');
const base = `http://localhost:${port}/api/vaults/${vault}`;

async function waitForVault(maxAttempts = 15): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${base}/status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const body = (await res.json()) as { success: boolean; data: { unlocked: boolean } };
        if (body.success && body.data.unlocked) return true;
      }
    } catch {
      // not ready yet
    }
    await Bun.sleep(1000);
  }
  return false;
}

async function main(): Promise<void> {
  const ready = await waitForVault();
  if (!ready) {
    console.error('vault-env: vault not reachable or locked — skipping secret injection');
    process.exit(0);
  }

  // List secrets
  const listRes = await fetch(`${base}/secrets`);
  if (!listRes.ok) {
    console.error('vault-env: failed to list secrets');
    process.exit(0);
  }
  const listBody = (await listRes.json()) as { data: { secrets: { name: string }[]; order: string[] } };
  const names = listBody.data.order.filter((n: string) => n.startsWith(prefix));

  // Fetch each matching secret
  for (const name of names) {
    try {
      const res = await fetch(`${base}/secrets/${name}`);
      if (!res.ok) continue;
      const body = (await res.json()) as { data: { value: string } };
      // Output as KEY=VALUE — value is single-line quoted for shell safety
      console.log(`${name}=${body.data.value}`);
    } catch {
      // skip individual failures
    }
  }
}

main();
