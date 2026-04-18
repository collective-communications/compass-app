import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';
import { embedSurveyResponses, MODEL_VERSION } from './handler.ts';

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
    const result = await embedSurveyResponses(client, surveyId, generateEmbeddings);
    return jsonResponse(result as unknown as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('EMBEDDING_FAILED', message, 500);
  }
});
