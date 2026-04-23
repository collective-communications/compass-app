/* eslint-disable no-console */

/**
 * Precondition helpers for agent-driven story verification.
 *
 * Each helper is an idempotent CLI entrypoint invoked by the `story-verify`
 * skill via Bash:
 *
 *   bun run .fixtures/preconditions.ts setOrgSetting <orgId> client_access_enabled false
 *   bun run .fixtures/preconditions.ts createInProgressResponse <token> 5
 *   bun run .fixtures/preconditions.ts createCompletedResponse <token>
 *   bun run .fixtures/preconditions.ts resetOrgSetting <orgId>
 *
 * All mutations use the service role key (bypass RLS). Safe to call from an
 * agent because writes are scoped to seeded fixture records.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

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

function client(): SupabaseClient {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Output contract for CLI callers.
 *
 * Success shape: `{ ok: true, data?: unknown }`
 * Failure shape: `{ ok: false, error: string }`
 *
 * Always prints exactly one JSON line to stdout and exits 0 on success, 1 on failure.
 */
function ok(data?: unknown): never {
  console.log(JSON.stringify({ ok: true, data: data ?? null }));
  process.exit(0);
}

function fail(error: string): never {
  console.log(JSON.stringify({ ok: false, error }));
  process.exit(1);
}

async function setOrgSetting(orgId: string, key: string, rawValue: string): Promise<void> {
  const value: boolean | string | number =
    rawValue === 'true' ? true : rawValue === 'false' ? false : Number.isFinite(Number(rawValue)) ? Number(rawValue) : rawValue;

  const db = client();

  if (key === 'client_access_enabled') {
    const { error } = await db
      .from('organizations')
      .update({ client_access_enabled: value as boolean })
      .eq('id', orgId);
    if (error) return fail(error.message);
    ok({ orgId, key, value });
  }

  // Generic settings JSONB write for other keys
  const { data: current, error: fetchErr } = await db
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();
  if (fetchErr || !current) return fail(fetchErr?.message ?? 'org not found');

  const nextSettings = { ...(current.settings as Record<string, unknown> | null ?? {}), [key]: value };
  const { error } = await db.from('organizations').update({ settings: nextSettings }).eq('id', orgId);
  if (error) return fail(error.message);
  ok({ orgId, key, value });
}

async function resetOrgSetting(orgId: string): Promise<void> {
  const db = client();
  const { error } = await db
    .from('organizations')
    .update({ client_access_enabled: true })
    .eq('id', orgId);
  if (error) return fail(error.message);
  ok({ orgId, reset: true });
}

async function getDeployment(token: string): Promise<{ id: string; survey_id: string }> {
  const db = client();
  const { data, error } = await db
    .from('deployments')
    .select('id, survey_id')
    .eq('token', token)
    .single();
  if (error || !data) throw new Error(`deployment not found for token ${token}: ${error?.message}`);
  return data as { id: string; survey_id: string };
}

async function createInProgressResponse(token: string, nAnswered: string): Promise<void> {
  const db = client();
  const n = Number(nAnswered);
  if (!Number.isInteger(n) || n < 0) return fail(`invalid nAnswered: ${nAnswered}`);

  const { id: deploymentId, survey_id } = await getDeployment(token);

  const responseId = randomUUID();
  const { data: resp, error } = await db
    .from('responses')
    .insert({
      id: responseId,
      deployment_id: deploymentId,
      session_token: responseId,
      submitted_at: null,
      is_complete: false,
    })
    .select('id, session_token')
    .single();
  if (error || !resp) return fail(`failed to insert response: ${error?.message}`);

  if (n > 0) {
    const { data: questions, error: qErr } = await db
      .from('questions')
      .select('id')
      .eq('survey_id', survey_id)
      .order('order_index', { ascending: true })
      .limit(n);
    if (qErr || !questions) return fail(`failed to fetch questions: ${qErr?.message}`);

    const answers = questions.map((q) => ({
      response_id: resp.id,
      question_id: q.id,
      likert_value: 3,
    }));
    const { error: ansErr } = await db.from('answers').insert(answers);
    if (ansErr) return fail(`failed to insert answers: ${ansErr.message}`);
  }

  ok({ responseId: resp.id, sessionToken: resp.session_token, answered: n });
}

async function createCompletedResponse(token: string): Promise<void> {
  const db = client();
  const { id: deploymentId } = await getDeployment(token);

  const responseId = randomUUID();
  const { data: resp, error } = await db
    .from('responses')
    .insert({
      id: responseId,
      deployment_id: deploymentId,
      session_token: responseId,
      submitted_at: new Date().toISOString(),
      is_complete: true,
    })
    .select('id, session_token')
    .single();
  if (error || !resp) return fail(`failed to insert response: ${error?.message}`);
  ok({ responseId: resp.id, sessionToken: resp.session_token, completed: true });
}

async function deleteResponse(responseId: string): Promise<void> {
  const db = client();
  const { error } = await db.from('responses').delete().eq('id', responseId);
  if (error) return fail(error.message);
  ok({ responseId, deleted: true });
}

async function main(): Promise<void> {
  const [, , cmd, ...args] = process.argv;
  try {
    switch (cmd) {
      case 'setOrgSetting':
        if (args.length < 3) return fail('usage: setOrgSetting <orgId> <key> <value>');
        await setOrgSetting(args[0]!, args[1]!, args[2]!);
        return;
      case 'resetOrgSetting':
        if (args.length < 1) return fail('usage: resetOrgSetting <orgId>');
        await resetOrgSetting(args[0]!);
        return;
      case 'createInProgressResponse':
        if (args.length < 2) return fail('usage: createInProgressResponse <token> <nAnswered>');
        await createInProgressResponse(args[0]!, args[1]!);
        return;
      case 'createCompletedResponse':
        if (args.length < 1) return fail('usage: createCompletedResponse <token>');
        await createCompletedResponse(args[0]!);
        return;
      case 'deleteResponse':
        if (args.length < 1) return fail('usage: deleteResponse <responseId>');
        await deleteResponse(args[0]!);
        return;
      default:
        return fail(`unknown command: ${cmd ?? '(none)'}`);
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

main();
