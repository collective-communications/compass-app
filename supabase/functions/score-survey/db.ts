import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Stale recalculation timeout in milliseconds (5 minutes). */
const STALE_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Query Types ───────────────────────────────────────────────────────────

/** Raw response row from the database. */
export interface ResponseRow {
  id: string;
  answers: Record<string, number>;
  metadata: {
    department: string;
    role: string;
    location: string;
    tenure: string;
  };
}

/** Question with its dimension mapping, joined from questions + question_dimensions + dimensions. */
export interface QuestionMeta {
  questionId: string;
  reverseScored: boolean;
  dimensionId: string;
  dimensionCode: string;
  weight: number;
}

/** Archetype row from the database. */
export interface ArchetypeRow {
  id: string;
  code: string;
  name: string;
  description: string;
  target_vectors: Record<string, number>;
  display_order: number;
}

/** Score row for batch insert. */
export interface ScoreInsert {
  survey_id: string;
  dimension_id: string;
  segment_type: string;
  segment_value: string;
  score: number;
  raw_score: number;
  response_count: number;
  calculated_at: string;
}

// ─── Queries ───────────────────────────────────────────────────────────────

/** Load all completed responses for a survey. */
export async function loadCompletedResponses(
  client: SupabaseClient,
  surveyId: string,
): Promise<ResponseRow[]> {
  const { data, error } = await client
    .from('responses')
    .select('id, answers, metadata')
    .eq('survey_id', surveyId)
    .not('completed_at', 'is', null);

  if (error) throw new Error(`Failed to load responses: ${error.message}`);
  return (data ?? []) as ResponseRow[];
}

/**
 * Load question metadata with dimension mappings for a survey.
 *
 * Joins questions → question_dimensions → dimensions to get the scoring
 * context needed for each question.
 */
export async function loadQuestionMetadata(
  client: SupabaseClient,
  surveyId: string,
): Promise<QuestionMeta[]> {
  const { data, error } = await client
    .from('question_dimensions')
    .select(`
      weight,
      dimension_id,
      dimensions!inner ( code ),
      questions!inner ( id, reverse_scored, survey_id )
    `)
    .eq('questions.survey_id', surveyId);

  if (error) throw new Error(`Failed to load question metadata: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(`No question-dimension mappings found for survey ${surveyId}`);
  }

  return data.map((row: Record<string, unknown>) => {
    const questions = row.questions as Record<string, unknown>;
    const dimensions = row.dimensions as Record<string, unknown>;
    return {
      questionId: questions.id as string,
      reverseScored: questions.reverse_scored as boolean,
      dimensionId: row.dimension_id as string,
      dimensionCode: dimensions.code as string,
      weight: row.weight as number,
    };
  });
}

/** Load all archetypes ordered by display_order. */
export async function loadArchetypes(
  client: SupabaseClient,
): Promise<ArchetypeRow[]> {
  const { data, error } = await client
    .from('archetypes')
    .select('*')
    .order('display_order');

  if (error) throw new Error(`Failed to load archetypes: ${error.message}`);
  return (data ?? []) as ArchetypeRow[];
}

/**
 * Check for a running recalculation on this survey.
 *
 * Returns the running recalculation if one exists and is not stale (> 5 min).
 * Auto-fails stale recalculations.
 */
export async function checkConcurrency(
  client: SupabaseClient,
  surveyId: string,
): Promise<{ blocked: boolean; staleId?: string }> {
  const { data, error } = await client
    .from('score_recalculations')
    .select('id, started_at')
    .eq('survey_id', surveyId)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to check concurrency: ${error.message}`);
  if (!data || data.length === 0) return { blocked: false };

  const running = data[0];
  const elapsed = Date.now() - new Date(running.started_at).getTime();

  if (elapsed > STALE_TIMEOUT_MS) {
    // Auto-fail stale recalculation
    await completeRecalculation(client, running.id, 'failed');
    return { blocked: false, staleId: running.id };
  }

  return { blocked: true };
}

/** Insert a new score_recalculations row with status 'running'. */
export async function insertRecalculation(
  client: SupabaseClient,
  surveyId: string,
  triggeredBy: string,
  reason: string,
): Promise<string> {
  const { data, error } = await client
    .from('score_recalculations')
    .insert({ survey_id: surveyId, triggered_by: triggeredBy, reason })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert recalculation: ${error.message}`);
  return data.id as string;
}

/** Update a recalculation's status and set completed_at. */
export async function completeRecalculation(
  client: SupabaseClient,
  recalcId: string,
  status: 'completed' | 'failed',
): Promise<void> {
  const { error } = await client
    .from('score_recalculations')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('id', recalcId);

  if (error) throw new Error(`Failed to update recalculation: ${error.message}`);
}

/**
 * Delete existing scores and batch insert new ones.
 *
 * Edge Functions lack transaction support via PostgREST, so this runs
 * delete then insert in sequence. The score_recalculations row provides
 * a concurrency guard.
 */
export async function upsertScores(
  client: SupabaseClient,
  surveyId: string,
  scores: ScoreInsert[],
): Promise<void> {
  // Delete existing scores for this survey
  const { error: deleteError } = await client
    .from('scores')
    .delete()
    .eq('survey_id', surveyId);

  if (deleteError) throw new Error(`Failed to delete existing scores: ${deleteError.message}`);

  // Batch insert new scores
  if (scores.length > 0) {
    const { error: insertError } = await client
      .from('scores')
      .insert(scores);

    if (insertError) throw new Error(`Failed to insert scores: ${insertError.message}`);
  }
}

/** Mark a survey as having scores calculated. */
export async function markSurveyScored(
  client: SupabaseClient,
  surveyId: string,
): Promise<void> {
  const { error } = await client
    .from('surveys')
    .update({ scores_calculated: true, scores_calculated_at: new Date().toISOString() })
    .eq('id', surveyId);

  if (error) throw new Error(`Failed to update survey: ${error.message}`);
}

/** Verify a survey exists and return its ID. Returns null if not found. */
export async function surveyExists(
  client: SupabaseClient,
  surveyId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('surveys')
    .select('id')
    .eq('id', surveyId)
    .single();

  if (error?.code === 'PGRST116') return false; // not found
  if (error) throw new Error(`Failed to check survey: ${error.message}`);
  return !!data;
}
