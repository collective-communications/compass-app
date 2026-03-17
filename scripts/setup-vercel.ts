#!/usr/bin/env bun
/**
 * Sets up Vercel project and stores IDs back into the tkr-secrets vault.
 *
 * 1. Reads VERCEL_TOKEN from the vault
 * 2. Runs `vercel link` to create/connect the project
 * 3. Reads VERCEL_ORG_ID and VERCEL_PROJECT_ID from .vercel/project.json
 * 4. Stores both IDs back into the vault
 * 5. Sets production env vars on the Vercel project from vault secrets
 *
 * Prerequisites:
 *   - tkr-secrets server running with "compass" vault unlocked
 *   - VERCEL_TOKEN set in the vault
 *   - `npx vercel` available
 *
 * Usage:
 *   bun run scripts/setup-vercel.ts [--port <vault-port>]
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

// --- CLI args ---

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const vaultPort = getArg("port", "42042");
const VAULT_BASE = `http://localhost:${vaultPort}`;
const VAULT = "compass";
const PROJECT_ROOT = join(import.meta.dir, "..");

// --- Vault helpers ---

async function vaultApi<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${VAULT_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data: T; error?: string };
  if (!json.success) {
    throw new Error(`Vault ${method} ${path}: ${json.error ?? res.status}`);
  }
  return json.data;
}

async function getSecret(name: string): Promise<string> {
  const result = await vaultApi<{ name: string; value: string }>(
    "GET",
    `/api/vaults/${VAULT}/secrets/${encodeURIComponent(name)}`
  );
  return result.value;
}

async function setSecret(name: string, value: string): Promise<void> {
  await vaultApi(
    "POST",
    `/api/vaults/${VAULT}/secrets/${encodeURIComponent(name)}`,
    { value }
  );
}

// --- Shell helpers ---

function run(cmd: string[], env?: Record<string, string>): { ok: boolean; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(cmd, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
  });
  return {
    ok: proc.exitCode === 0,
    stdout: proc.stdout.toString().trim(),
    stderr: proc.stderr.toString().trim(),
  };
}

// --- Main ---

async function main(): Promise<void> {
  // 1. Get token from vault
  console.log("Reading VERCEL_TOKEN from vault...");
  const token = await getSecret("VERCEL_TOKEN");
  if (!token) {
    console.error("VERCEL_TOKEN is empty in the vault. Set it first:");
    console.error(`  Open http://localhost:${vaultPort} → compass vault → Vercel group`);
    process.exit(1);
  }
  console.log("  Got token");

  // 2. Link project
  const vercelJsonPath = join(PROJECT_ROOT, ".vercel", "project.json");
  const alreadyLinked = existsSync(vercelJsonPath);

  if (alreadyLinked) {
    console.log("Project already linked (.vercel/project.json exists)");
  } else {
    console.log("Linking Vercel project...");
    const result = run(["npx", "vercel", "link", "--yes", `--token=${token}`]);
    if (!result.ok) {
      console.error("vercel link failed:", result.stderr);
      process.exit(1);
    }
    console.log("  Linked successfully");
  }

  // 3. Read project.json
  if (!existsSync(vercelJsonPath)) {
    console.error("Expected .vercel/project.json but it doesn't exist");
    process.exit(1);
  }

  const projectJson = JSON.parse(
    await Bun.file(vercelJsonPath).text()
  ) as { orgId: string; projectId: string };

  const orgId = projectJson.orgId;
  const projectId = projectJson.projectId;

  console.log(`  Org ID:     ${orgId}`);
  console.log(`  Project ID: ${projectId}`);

  // 4. Store IDs back in vault
  console.log("Storing IDs in vault...");
  await setSecret("VERCEL_ORG_ID", orgId);
  await setSecret("VERCEL_PROJECT_ID", projectId);
  console.log("  Saved VERCEL_ORG_ID and VERCEL_PROJECT_ID");

  // 5. Set production env vars on Vercel project
  console.log("Setting production env vars on Vercel...");

  const envVars: Array<{ name: string; vaultKey: string }> = [
    { name: "VITE_SUPABASE_URL", vaultKey: "VITE_SUPABASE_URL" },
    { name: "VITE_SUPABASE_ANON_KEY", vaultKey: "VITE_SUPABASE_ANON_KEY" },
    { name: "VITE_APP_URL", vaultKey: "VITE_APP_URL" },
  ];

  for (const { name, vaultKey } of envVars) {
    const value = await getSecret(vaultKey);
    if (!value) {
      console.log(`  Skipping ${name} (empty in vault)`);
      continue;
    }

    // vercel env add reads from stdin
    const proc = Bun.spawn(
      ["npx", "vercel", "env", "add", name, "production", `--token=${token}`],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env, VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projectId },
        stdin: new Blob([value]),
      }
    );
    await proc.exited;
    if (proc.exitCode === 0) {
      console.log(`  Set ${name}`);
    } else {
      console.log(`  ${name} may already exist (skipped)`);
    }
  }

  // 6. Add production domain (idempotent — no-ops if already added)
  console.log("Adding production domain...");
  const domainResult = run(
    ["npx", "vercel", "domains", "add", "app.collectiveculturecompass.com", `--token=${token}`],
    { VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projectId },
  );
  if (domainResult.ok) {
    console.log("  Domain added (or already exists)");
  } else {
    console.log("  Domain add warning:", domainResult.stderr);
  }

  // 7. Configure Supabase auth + secrets
  console.log("Configuring Supabase...");

  let supabaseAccessToken: string;
  let supabaseUrl: string;
  try {
    supabaseAccessToken = await getSecret("SUPABASE_ACCESS_TOKEN");
    supabaseUrl = await getSecret("SUPABASE_URL");
  } catch {
    supabaseAccessToken = "";
    supabaseUrl = "";
  }

  if (!supabaseAccessToken || !supabaseUrl) {
    console.log("  Skipping Supabase setup (SUPABASE_ACCESS_TOKEN or SUPABASE_URL not in vault)");
  } else {
    // Extract project ref from URL (e.g. https://abcdef.supabase.co → abcdef)
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const appUrl = "https://app.collectiveculturecompass.com";
    const callbackUrl = `${appUrl}/auth/callback`;

    // Set edge function secret
    console.log("  Setting APP_URL edge function secret...");
    const secretResult = run(
      ["npx", "supabase", "secrets", "set", `APP_URL=${appUrl}`, "--project-ref", projectRef],
      { SUPABASE_ACCESS_TOKEN: supabaseAccessToken },
    );
    if (secretResult.ok) {
      console.log("    Set APP_URL");
    } else {
      console.log("    Warning:", secretResult.stderr);
    }

    // Configure auth via Management API
    console.log("  Configuring auth redirect URLs...");
    const MGMT_API = "https://api.supabase.com";
    const headers = {
      "Authorization": `Bearer ${supabaseAccessToken}`,
      "Content-Type": "application/json",
    };

    try {
      // Read current auth config
      const authRes = await fetch(`${MGMT_API}/v1/projects/${projectRef}/config/auth`, { headers });
      if (!authRes.ok) throw new Error(`GET auth config: ${authRes.status}`);
      const auth = (await authRes.json()) as { site_url: string; uri_allow_list: string };

      // Build updated allow-list (idempotent)
      const existing = auth.uri_allow_list
        ? auth.uri_allow_list.split(",").map((u) => u.trim()).filter(Boolean)
        : [];
      const allowList = existing.includes(callbackUrl) ? existing : [...existing, callbackUrl];

      // Patch auth config
      const patchRes = await fetch(`${MGMT_API}/v1/projects/${projectRef}/config/auth`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          site_url: appUrl,
          uri_allow_list: allowList.join(","),
        }),
      });
      if (!patchRes.ok) throw new Error(`PATCH auth config: ${patchRes.status}`);

      console.log(`    site_url → ${appUrl}`);
      console.log(`    redirect allow-list: ${allowList.join(", ")}`);
    } catch (err) {
      console.log(`    Auth config warning: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\nSetup complete!");
  console.log("\nRemaining manual step:");
  console.log("  DNS: CNAME app.collectiveculturecompass.com → cname.vercel-dns.com");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
