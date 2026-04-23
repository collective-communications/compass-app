/* eslint-disable no-console */

/**
 * Exports the deterministic seed state to `.fixtures/seed.json` so
 * agent-driven story verification can look up tokens, user IDs, and org IDs
 * by semantic name (e.g. `tokens.expired`) instead of chasing stdout.
 *
 * Run AFTER `bun run db:seed`. Reads the live Supabase Cloud state via the
 * service-role key and writes a JSON snapshot to `.fixtures/seed.json`.
 *
 * Usage: bun run scripts/export-seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = 'TestPass123!';

const DEPLOYMENT_IDS = {
  valid_active: '00000000-0000-0000-0000-000000000200',
  expired: '00000000-0000-0000-0000-000000000201',
  not_yet_open: '00000000-0000-0000-0000-000000000202',
  closed: '00000000-0000-0000-0000-000000000203',
} as const;

const ORG_IDS = {
  ccc: '00000000-0000-0000-0000-000000000001',
  client: '00000000-0000-0000-0000-000000000002',
  clientB: '00000000-0000-0000-0000-000000000003',
  noAccess: '00000000-0000-0000-0000-000000000004',
  noSettings: '00000000-0000-0000-0000-000000000005',
} as const;

const SURVEY_IDS = {
  active: '00000000-0000-0000-0000-000000000100',
  lakeside: '00000000-0000-0000-0000-000000000101',
  closed: '00000000-0000-0000-0000-000000000102',
} as const;

const USER_EMAILS = {
  ccc_admin: 'admin@collectivecommunication.ca',
  ccc_member: 'member@collectivecommunication.ca',
  client_exec: 'exec@rivervalleyhealth.ca',
  client_director: 'director@rivervalleyhealth.ca',
  client_manager: 'manager@rivervalleyhealth.ca',
  client_user: 'user@rivervalleyhealth.ca',
  client_exec_lakeside: 'exec@lakesideclinic.ca',
} as const;

type SeedExport = {
  generatedAt: string;
  baseUrl: string;
  password: string;
  tokens: Record<keyof typeof DEPLOYMENT_IDS, string>;
  orgs: Record<keyof typeof ORG_IDS, { id: string; name: string; client_access_enabled: boolean | null }>;
  surveyIds: Record<keyof typeof SURVEY_IDS, string>;
  users: Record<keyof typeof USER_EMAILS, { email: string; password: string; userId: string; orgId: string | null; role: string }>;
};

async function fetchTokens(): Promise<Record<keyof typeof DEPLOYMENT_IDS, string>> {
  const entries = await Promise.all(
    (Object.entries(DEPLOYMENT_IDS) as Array<[keyof typeof DEPLOYMENT_IDS, string]>).map(
      async ([label, id]) => {
        const { data, error } = await supabase
          .from('deployments')
          .select('token')
          .eq('id', id)
          .single();
        if (error || !data) throw new Error(`Missing deployment ${label} (${id}): ${error?.message}`);
        return [label, data.token] as const;
      },
    ),
  );
  return Object.fromEntries(entries) as Record<keyof typeof DEPLOYMENT_IDS, string>;
}

async function fetchOrgs(): Promise<SeedExport['orgs']> {
  const ids = Object.values(ORG_IDS);
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, client_access_enabled')
    .in('id', ids);
  if (error || !data) throw new Error(`Failed to fetch orgs: ${error?.message}`);
  const byId = new Map(data.map((o) => [o.id, o]));
  const result = {} as SeedExport['orgs'];
  for (const [label, id] of Object.entries(ORG_IDS) as Array<[keyof typeof ORG_IDS, string]>) {
    const row = byId.get(id);
    if (!row) throw new Error(`Missing org ${label} (${id})`);
    result[label] = {
      id: row.id,
      name: row.name,
      client_access_enabled: row.client_access_enabled ?? null,
    };
  }
  return result;
}

async function fetchUsers(): Promise<SeedExport['users']> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  const byEmail = new Map((data.users ?? []).map((u) => [u.email?.toLowerCase() ?? '', u]));

  const { data: members, error: membersErr } = await supabase
    .from('org_members')
    .select('user_id, organization_id, role');
  if (membersErr || !members) throw new Error(`Failed to fetch org_members: ${membersErr?.message}`);
  const memberByUser = new Map(members.map((m) => [m.user_id, m]));

  const result = {} as SeedExport['users'];
  for (const [label, email] of Object.entries(USER_EMAILS) as Array<[keyof typeof USER_EMAILS, string]>) {
    const user = byEmail.get(email.toLowerCase());
    if (!user) throw new Error(`Missing auth user for ${label} (${email})`);
    const member = memberByUser.get(user.id);
    result[label] = {
      email,
      password: TEST_PASSWORD,
      userId: user.id,
      orgId: member?.organization_id ?? null,
      role: member?.role ?? 'unknown',
    };
  }
  return result;
}

async function main(): Promise<void> {
  console.log('Exporting seed fixtures...');
  const [tokens, orgs, users] = await Promise.all([fetchTokens(), fetchOrgs(), fetchUsers()]);

  const exported: SeedExport = {
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://localhost:42333',
    password: TEST_PASSWORD,
    tokens,
    orgs,
    surveyIds: SURVEY_IDS,
    users,
  };

  const outDir = resolve(import.meta.dirname, '..', '.fixtures');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'seed.json');
  writeFileSync(outPath, JSON.stringify(exported, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log(`  tokens:   ${Object.keys(tokens).length}`);
  console.log(`  orgs:     ${Object.keys(orgs).length}`);
  console.log(`  surveys:  ${Object.keys(SURVEY_IDS).length}`);
  console.log(`  users:    ${Object.keys(users).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
