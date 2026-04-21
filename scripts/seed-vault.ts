#!/usr/bin/env bun
/**
 * Seed script for tkr-secrets vault.
 *
 * Creates a "compass" vault with grouped secrets discovered from the codebase.
 * Pre-populates deterministic values (git remote, known defaults). All other
 * secrets are created as empty keys — populate via the tkr-secrets UI.
 *
 * This script replaces all .env files in the project. The vault becomes
 * the single source of truth for secrets.
 *
 * Prerequisites:
 *   - tkr-secrets server running on port 42042 (default)
 *   - No existing "compass" vault (or pass --force to delete and recreate)
 *
 * Usage:
 *   bun run scripts/seed-vault.ts --password <pwd> [--force] [--port <port>]
 */

// --- CLI args ---

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const force = args.includes("--force");
const port = getArg("port", "42042");
const password = getArg("password", "");
const BASE = `http://localhost:${port}`;
const VAULT = "compass";

if (!password) {
  console.error("Usage: bun run scripts/seed-vault.ts --password <pwd> [--force] [--port <port>]");
  process.exit(1);
}

// --- HTTP helpers ---

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data: T; error?: string };
  if (!json.success) {
    throw new Error(`API ${method} ${path}: ${json.error ?? res.status}`);
  }
  return { ok: json.success, status: res.status, data: json.data };
}

// --- Secrets manifest ---

interface SecretDef {
  name: string;
  /** Value to pre-populate. Empty string = needs manual entry. */
  value: string;
  /** Where this value came from (for the summary output). */
  source?: string;
}

interface GroupDef {
  name: string;
  secrets: SecretDef[];
}

/** Git remote → owner/repo */
function parseGitRemote(): { owner: string; repo: string } {
  try {
    const proc = Bun.spawnSync(["git", "remote", "get-url", "origin"]);
    const url = proc.stdout.toString().trim();
    // git@github.com-ccc:collective-communications/compass-app.git
    // https://github.com/owner/repo.git
    const match = url.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (match) return { owner: match[1], repo: match[2] };
  } catch { /* fallback */ }
  return { owner: "", repo: "" };
}

const { owner, repo } = parseGitRemote();

const groups: GroupDef[] = [
  {
    name: "Supabase",
    secrets: [
      { name: "VITE_SUPABASE_URL", value: "" },
      { name: "VITE_SUPABASE_ANON_KEY", value: "" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", value: "" },
      { name: "SUPABASE_ACCESS_TOKEN", value: "" },
      { name: "SUPABASE_URL", value: "" },
    ],
  },
  {
    name: "Vercel",
    secrets: [
      { name: "VERCEL_TOKEN", value: "" },
      { name: "VERCEL_ORG_ID", value: "" },
      { name: "VERCEL_PROJECT_ID", value: "" },
    ],
  },
  {
    name: "GitHub",
    secrets: [
      { name: "GITHUB_TOKEN", value: "" },
      { name: "GITHUB_OWNER", value: owner, source: "git remote" },
      { name: "GITHUB_REPO", value: repo, source: "git remote" },
    ],
  },
  {
    name: "Resend",
    secrets: [
      { name: "RESEND_CCC_SEND", value: "", source: "send-only API key" },
      { name: "RESEND_CCC_ADMIN", value: "", source: "full access API key" },
      { name: "RESEND_FROM_ADDRESS", value: "noreply@mail.collectiveculturecompass.com", source: "default" },
    ],
  },
  {
    name: "OpenAI",
    secrets: [
      { name: "OPENAI_API_KEY", value: "" },
    ],
  },
  {
    name: "App",
    secrets: [
      { name: "VITE_APP_URL", value: "http://localhost:42333", source: "default" },
      { name: "APP_URL", value: "https://app.collectiveculturecompass.com", source: "default" },
    ],
  },
  {
    name: "E2E Testing",
    secrets: [
      { name: "E2E_SUPABASE_URL", value: "" },
      { name: "E2E_SUPABASE_SERVICE_KEY", value: "" },
    ],
  },
  // OAuth provider credentials — pushed to Supabase Auth config via the
  // `configureOAuthProviders` deploy step (maps to `external_<p>_client_id`
  // / `external_<p>_secret` fields on the project's auth config).
  {
    name: "Google OAuth",
    secrets: [
      { name: "GOOGLE_OAUTH_CLIENT_ID", value: "", source: "GCP → APIs & Services → Credentials" },
      { name: "GOOGLE_OAUTH_CLIENT_SECRET", value: "", source: "GCP → APIs & Services → Credentials" },
    ],
  },
  {
    name: "Microsoft OAuth",
    secrets: [
      { name: "AZURE_OAUTH_CLIENT_ID", value: "", source: "Entra ID → App registrations → Overview" },
      { name: "AZURE_OAUTH_CLIENT_SECRET", value: "", source: "Entra ID → App registrations → Certificates & secrets" },
      { name: "AZURE_OAUTH_TENANT", value: "common", source: "default (multi-tenant); set to tenant GUID for single-tenant" },
    ],
  },
  {
    name: "Deploy",
    secrets: [
      { name: "HEALTH_CHECK_URL", value: "" },
      { name: "DEPLOY_PORT", value: "4200", source: "default" },
    ],
  },
];

// --- Main ---

async function main(): Promise<void> {
  // 1. Check server is reachable
  try {
    const res = await fetch(`${BASE}/api/vaults`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch {
    console.error(`Cannot reach tkr-secrets at ${BASE}. Is the server running?`);
    console.error(`  Start with: cd tkr-secrets && bun run dev`);
    process.exit(1);
  }

  // 2. Check if vault exists
  const { data: listData } = await api<{ vaults: Array<{ name: string }> }>("GET", "/api/vaults");
  const exists = listData.vaults.some((v) => v.name === VAULT);

  if (exists && !force) {
    console.error(`Vault "${VAULT}" already exists. Use --force to delete and recreate.`);
    process.exit(1);
  }

  if (exists && force) {
    try {
      await api("POST", `/api/vaults/${VAULT}/unlock`, { password });
    } catch { /* may already be unlocked */ }
    await api("DELETE", `/api/vaults/${VAULT}`);
    console.log(`Deleted existing vault "${VAULT}"`);
  }

  // 3. Create vault
  const { data: createData } = await api<{ name: string; recoveryKey: { mnemonic: string; raw: string } }>(
    "POST",
    "/api/vaults",
    { name: VAULT, password }
  );
  console.log(`\nCreated vault "${createData.name}"`);
  console.log(`\n--- RECOVERY KEY (save this!) ---`);
  console.log(`Mnemonic: ${createData.recoveryKey.mnemonic}`);
  console.log(`Raw: ${createData.recoveryKey.raw}`);
  console.log(`---------------------------------\n`);

  // 4. Create groups and set secrets
  let populated = 0;
  let empty = 0;

  for (const group of groups) {
    const secretNames: string[] = [];

    for (const secret of group.secrets) {
      await api("POST", `/api/vaults/${VAULT}/secrets/${secret.name}`, { value: secret.value });
      secretNames.push(secret.name);

      if (secret.value) {
        populated++;
      } else {
        empty++;
      }
    }

    await api("POST", `/api/vaults/${VAULT}/groups`, {
      name: group.name,
      secrets: secretNames,
    });
  }

  // 5. Set ordering to match group order
  const allSecretNames = groups.flatMap((g) => g.secrets.map((s) => s.name));
  await api("PUT", `/api/vaults/${VAULT}/order`, { secretOrder: allSecretNames });

  // 6. Summary
  const total = populated + empty;
  console.log("Vault seeded successfully!\n");
  console.log(`  Groups:          ${groups.length}`);
  console.log(`  Secrets (total): ${total}`);
  console.log(`  Pre-populated:   ${populated}`);
  console.log(`  Needs values:    ${empty}`);
  console.log("");

  // Show pre-populated
  const prePopulated = groups.flatMap((g) =>
    g.secrets.filter((s) => s.value).map((s) => ({ name: s.name, group: g.name, source: s.source ?? "" }))
  );
  if (prePopulated.length > 0) {
    console.log("Pre-populated:");
    for (const s of prePopulated) {
      console.log(`  ${s.name.padEnd(32)} (${s.source})`);
    }
    console.log("");
  }

  // Show what needs manual entry
  const needsValues = groups.flatMap((g) =>
    g.secrets.filter((s) => !s.value).map((s) => ({ name: s.name, group: g.name }))
  );
  if (needsValues.length > 0) {
    console.log("Needs values:");
    console.log("┌─────────────────────────────────┬──────────────┐");
    console.log("│ Secret                          │ Group        │");
    console.log("├─────────────────────────────────┼──────────────┤");
    for (const s of needsValues) {
      console.log(`│ ${s.name.padEnd(31)} │ ${s.group.padEnd(12)} │`);
    }
    console.log("└─────────────────────────────────┴──────────────┘");
    console.log(`\nSet via UI: http://localhost:${port}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
