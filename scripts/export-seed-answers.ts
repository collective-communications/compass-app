/* eslint-disable no-console */

/**
 * Exports average Likert values from all seed surveys to a committed
 * TypeScript fixture so the Scoring Validator presets always reflect
 * real data from the seeded database.
 *
 * Covers:
 *   - 5 named scenario surveys from seed-scenarios.ts
 *   - River Valley Health baseline survey from seed-dev.ts
 *
 * Uses the service-role key to bypass RLS and read mean_score per question
 * from the question_scores view, matching questions by order_index (1 = Q1).
 *
 * Usage: bun run export-seed-answers
 * Run AFTER bun run db:seed to keep the fixture in sync.
 *
 * Output: apps/web/src/features/dev/scoring-validator/data/seed-defaults.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
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

// ---------------------------------------------------------------------------
// Survey IDs — deterministic, matching seed-dev.ts and seed-scenarios.ts
// ---------------------------------------------------------------------------

// seed-scenarios.ts: scenarioUuid(N, 'survey') = 10000000-0000-000N-0002-000000000000
function scenarioSurveyId(n: number): string {
  return `10000000-0000-000${n}-0002-000000000000`;
}

interface SeedSurvey {
  id: string;
  presetId: string;
  name: string;
  description: string;
}

const SURVEYS: SeedSurvey[] = [
  {
    id: '00000000-0000-0000-0000-000000000100',
    presetId: 'river-valley',
    name: 'River Valley Health',
    description: 'Baseline dev survey — 24 synthetic respondents across 5 departments.',
  },
  {
    id: scenarioSurveyId(1),
    presetId: 'aligned-thriving',
    name: 'Aligned & Thriving',
    description: 'High performance across all dimensions — a well-rounded, trust-rich culture. Core 85, Clarity 80, Connection 80, Collaboration 80.',
  },
  {
    id: scenarioSurveyId(2),
    presetId: 'command-control',
    name: 'Command & Control',
    description: 'Strong clarity but critically low connection and collaboration — top-down culture with psychological safety issues. Core 50, Clarity 75, Connection 30, Collaboration 35.',
  },
  {
    id: scenarioSurveyId(3),
    presetId: 'well-intentioned',
    name: 'Well-Intentioned but Disconnected',
    description: 'Caring culture with mission alignment but lacking structure, decision frameworks, and role clarity. Core 55, Clarity 55, Connection 45, Collaboration 50.',
  },
  {
    id: scenarioSurveyId(4),
    presetId: 'over-collaborated',
    name: 'Over-Collaborated',
    description: 'Strong relationships and collaboration culture but decision paralysis and unsustainable pace. Core 60, Clarity 40, Connection 80, Collaboration 85.',
  },
  {
    id: scenarioSurveyId(5),
    presetId: 'busy-burned-out',
    name: 'Busy but Burned Out',
    description: 'Low scores across the board — exhausted workforce, broken communication, invisible leadership. Core 30, Clarity 35, Connection 25, Collaboration 40.',
  },
];

// ---------------------------------------------------------------------------
// Question matching
// ---------------------------------------------------------------------------

// Questions Q1–Q55 map to order_index 1–55.
// Q56 (pride/S4) and Q57 (open-ended) are excluded from our 55-question fixture.
function orderToQuestionId(order: number): string | null {
  if (order < 1 || order > 55) return null;
  return `Q${order}`;
}

interface QuestionScoreRow {
  order_index: number;
  mean_score: number;
  dist_5: number;
}

async function fetchSurveyDefaults(
  supabase: ReturnType<typeof createClient>,
  surveyId: string,
): Promise<{ scaleSize: 4 | 5; values: Record<string, number> } | null> {
  const { data, error } = await supabase
    .from('question_scores')
    .select('order_index, mean_score, dist_5')
    .eq('survey_id', surveyId)
    .not('mean_score', 'is', null);

  if (error) throw new Error(`Failed to fetch survey ${surveyId}: ${error.message}`);
  if (!data || data.length === 0) return null;

  const rows = data as QuestionScoreRow[];
  const scaleSize: 4 | 5 = rows.some((r) => r.dist_5 > 0) ? 5 : 4;

  const values: Record<string, number> = {};
  for (const row of rows) {
    const qId = orderToQuestionId(row.order_index);
    if (!qId || row.mean_score == null) continue;
    values[qId] = Math.min(scaleSize, Math.max(1, Math.round(row.mean_score)));
  }

  return { scaleSize, values };
}

// ---------------------------------------------------------------------------
// Output generation
// ---------------------------------------------------------------------------

function renderValuesBlock(values: Record<string, number>): string {
  return Object.entries(values)
    .sort((a, b) => parseInt(a[0].slice(1), 10) - parseInt(b[0].slice(1), 10))
    .map(([k, v]) => `      ${k}: ${v},`)
    .join('\n');
}

async function main(): Promise<void> {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{
    survey: SeedSurvey;
    scaleSize: 4 | 5;
    values: Record<string, number>;
    count: number;
  }> = [];

  for (const survey of SURVEYS) {
    const defaults = await fetchSurveyDefaults(supabase, survey.id);
    if (!defaults) {
      console.warn(`  ⚠ No data for "${survey.name}" (${survey.id}) — skipping`);
      continue;
    }
    results.push({
      survey,
      scaleSize: defaults.scaleSize,
      values: defaults.values,
      count: Object.keys(defaults.values).length,
    });
    console.log(`  ✓ ${survey.name}: ${Object.keys(defaults.values).length} questions · ${defaults.scaleSize}pt`);
  }

  if (results.length === 0) {
    throw new Error('No survey data found — run `bun run db:seed` first.');
  }

  const generatedAt = new Date().toISOString();

  const scenariosBlock = results
    .map(
      ({ survey, scaleSize, values }) =>
        `  {\n` +
        `    id: '${survey.presetId}',\n` +
        `    name: '${survey.name}',\n` +
        `    description: '${survey.description.replace(/'/g, "\\'")}',\n` +
        `    scaleSize: ${scaleSize} as const satisfies 4 | 5,\n` +
        `    values: {\n` +
        `${renderValuesBlock(values)}\n` +
        `    } as Record<string, number>,\n` +
        `  }`,
    )
    .join(',\n');

  const output =
    `// Auto-generated by scripts/export-seed-answers.ts — do not edit by hand.\n` +
    `// Run \`bun run export-seed-answers\` after \`bun run db:seed\` to refresh.\n` +
    `// Generated: ${generatedAt} · ${results.length} surveys\n` +
    `\n` +
    `export interface ScenarioDefault {\n` +
    `  id: string;\n` +
    `  name: string;\n` +
    `  description: string;\n` +
    `  scaleSize: 4 | 5;\n` +
    `  values: Record<string, number>;\n` +
    `}\n` +
    `\n` +
    `export const SCENARIO_DEFAULTS: readonly ScenarioDefault[] = [\n` +
    `${scenariosBlock},\n` +
    `];\n`;

  const outPath = resolve(
    import.meta.dirname,
    '..',
    'apps/web/src/features/dev/scoring-validator/data/seed-defaults.ts',
  );
  writeFileSync(outPath, output, 'utf-8');

  console.log(`\nWrote ${outPath}`);
  console.log(`  ${results.length} presets exported`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
