/**
 * Pure orchestration for the embed-responses edge function.
 *
 * Factored out of index.ts so the happy-path, fallback, empty-set, and
 * provider-failure branches are testable under Bun. `index.ts` composes this
 * handler with `Deno.serve`, `Deno.env.get`, and `createClient` from esm.sh.
 *
 * All external dependencies are injected:
 *   - `client`   — a Supabase client (or a mock in tests)
 *   - `embed`    — the embedding provider (OpenAI by default in production)
 *
 * This keeps the file free of `Deno.*` / `https://esm.sh/*` references so it
 * imports cleanly into a Bun test runner.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const MODEL_VERSION = 'text-embedding-3-small';
export const BATCH_SIZE = 100;

/** The function accepting an array of texts and returning their embeddings. */
export type EmbedFn = (texts: string[]) => Promise<number[][]>;

export interface EmbedAnswer {
  response_id: string;
  question_id: string;
  text_value: string;
}

export interface EmbedResult {
  surveyId: string;
  embeddingsCreated: number;
  message?: string;
}

/**
 * Run the embedding pipeline for a single survey. Returns the count of newly
 * inserted embedding rows.
 *
 * Throws on embedding provider failure or upsert failure; the caller is
 * expected to turn those into a 500 error envelope.
 */
export async function embedSurveyResponses(
  client: SupabaseClient,
  surveyId: string,
  embed: EmbedFn,
): Promise<EmbedResult> {
  // Happy path: try the RPC first. When it succeeds we SKIP the fallback
  // (matches the invariant called out in index.ts — `queryError` is null on
  // 2xx under supabase-js v2).
  const { data: rpcAnswers, error: queryError } = await client.rpc('get_unembedded_answers', {
    p_survey_id: surveyId,
    p_model_version: MODEL_VERSION,
  });

  let pendingAnswers: EmbedAnswer[] | null = rpcAnswers as EmbedAnswer[] | null;

  if (queryError) {
    // Fallback — used only when the RPC is missing or errored.
    const { data, error } = await client
      .from('answers')
      .select(
        `
          id,
          response_id,
          question_id,
          text_value,
          questions!inner(survey_id, type)
        `,
      )
      .eq('questions.survey_id', surveyId)
      .eq('questions.type', 'open_text')
      .not('text_value', 'is', null)
      .neq('text_value', '');

    if (error) {
      throw new Error(`Failed to query answers: ${error.message}`);
    }

    if (data && data.length > 0) {
      const responseIds = (data as { response_id: string }[]).map((a) => a.response_id);
      const { data: existingEmbeddings } = await client
        .from('dialogue_embeddings')
        .select('response_id')
        .in('response_id', responseIds)
        .eq('model_version', MODEL_VERSION);

      const existingSet = new Set(
        ((existingEmbeddings as { response_id: string }[] | null) ?? []).map((e) => e.response_id),
      );
      pendingAnswers = (data as EmbedAnswer[]).filter((a) => !existingSet.has(a.response_id));
    } else {
      pendingAnswers = [];
    }
  }

  if (!pendingAnswers || pendingAnswers.length === 0) {
    return { surveyId, embeddingsCreated: 0, message: 'No new responses to embed' };
  }

  let totalCreated = 0;

  for (let i = 0; i < pendingAnswers.length; i += BATCH_SIZE) {
    const batch = pendingAnswers.slice(i, i + BATCH_SIZE);
    const texts = batch.map((a) => a.text_value);

    const embeddings = await embed(texts);

    const rows = batch.map((a, idx) => ({
      response_id: a.response_id,
      question_id: a.question_id,
      survey_id: surveyId,
      embedding: JSON.stringify(embeddings[idx]),
      model_version: MODEL_VERSION,
    }));

    const { error: upsertError } = await client
      .from('dialogue_embeddings')
      .upsert(rows, { onConflict: 'response_id,model_version' });

    if (upsertError) {
      throw new Error(`Failed to upsert embeddings: ${upsertError.message}`);
    }

    totalCreated += rows.length;
  }

  return { surveyId, embeddingsCreated: totalCreated };
}
