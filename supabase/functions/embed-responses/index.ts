import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_VERSION = 'text-embedding-3-small';
const BATCH_SIZE = 100;

// ─── JSON Response Helpers ────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

// ─── OpenAI Embedding Helper ──────────────────────────────────────────────────

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_VERSION,
      input: texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'embed-responses' });
  }

  // Only POST
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Parse request body
  let surveyId: string;
  try {
    const body = await req.json();
    surveyId = body.surveyId;

    if (!surveyId || typeof surveyId !== 'string') {
      return errorResponse('INVALID_REQUEST', 'surveyId is required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON with surveyId', 400);
  }

  // Create Supabase client with service_role for full access
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize the caller
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;

  try {
    // Query open-text answers that don't already have embeddings for this model
    const { data: answers, error: queryError } = await client.rpc('get_unembedded_answers', {
      p_survey_id: surveyId,
      p_model_version: MODEL_VERSION,
    });

    // Fallback: use raw query if RPC doesn't exist
    let pendingAnswers = answers;
    if (queryError) {
      const { data, error } = await client
        .from('answers')
        .select(`
          id,
          response_id,
          question_id,
          text_value,
          questions!inner(survey_id, type)
        `)
        .eq('questions.survey_id', surveyId)
        .eq('questions.type', 'open_text')
        .not('text_value', 'is', null)
        .neq('text_value', '');

      if (error) {
        throw new Error(`Failed to query answers: ${error.message}`);
      }

      // Filter out answers that already have embeddings
      if (data && data.length > 0) {
        const responseIds = data.map((a: { response_id: string }) => a.response_id);
        const { data: existingEmbeddings } = await client
          .from('dialogue_embeddings')
          .select('response_id')
          .in('response_id', responseIds)
          .eq('model_version', MODEL_VERSION);

        const existingSet = new Set(
          (existingEmbeddings ?? []).map((e: { response_id: string }) => e.response_id),
        );
        pendingAnswers = data.filter(
          (a: { response_id: string }) => !existingSet.has(a.response_id),
        );
      } else {
        pendingAnswers = [];
      }
    }

    if (!pendingAnswers || pendingAnswers.length === 0) {
      return jsonResponse({ surveyId, embeddingsCreated: 0, message: 'No new responses to embed' });
    }

    // Process in batches
    let totalCreated = 0;

    for (let i = 0; i < pendingAnswers.length; i += BATCH_SIZE) {
      const batch = pendingAnswers.slice(i, i + BATCH_SIZE);
      const texts = batch.map((a: { text_value: string }) => a.text_value);

      // Generate embeddings via OpenAI
      const embeddings = await generateEmbeddings(texts);

      // Prepare upsert rows
      const rows = batch.map((a: { response_id: string; question_id: string }, idx: number) => ({
        response_id: a.response_id,
        question_id: a.question_id,
        survey_id: surveyId,
        embedding: JSON.stringify(embeddings[idx]),
        model_version: MODEL_VERSION,
      }));

      // Upsert into dialogue_embeddings (idempotent via unique index)
      const { error: upsertError } = await client
        .from('dialogue_embeddings')
        .upsert(rows, { onConflict: 'response_id,model_version' });

      if (upsertError) {
        throw new Error(`Failed to upsert embeddings: ${upsertError.message}`);
      }

      totalCreated += rows.length;
    }

    return jsonResponse({
      surveyId,
      embeddingsCreated: totalCreated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('EMBEDDING_FAILED', message, 500);
  }
});
