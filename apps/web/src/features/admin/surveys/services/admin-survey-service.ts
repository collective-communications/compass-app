/**
 * Supabase queries for admin survey management.
 * Handles CRUD operations for surveys, questions, and template-based creation.
 */

import type {
  Survey,
  SurveyStatus,
  Question,
  QuestionWithDimension,
  Dimension,
  SubDimension,
  SurveyTemplate,
} from '@compass/types';
import { supabase } from '../../../../lib/supabase';
import { mapSurveyRow, mapQuestionRow, mapDimensionRow, mapSubDimensionRow } from '../../../../lib/mappers/survey-mappers';

// ─── List Types ─────────────────────────────────────────────────────────────

/** Survey with aggregated response statistics for list display */
export interface SurveyListItem extends Survey {
  responseCount: number;
  completionPercent: number;
}

/** Survey with full question and dimension data for the builder */
export interface SurveyBuilderData {
  survey: Survey;
  questions: QuestionWithDimension[];
  dimensions: Dimension[];
  subDimensions: SubDimension[];
  hasResponses: boolean;
}

/** Parameters for creating a new survey */
export interface CreateSurveyParams {
  organizationId: string;
  title: string;
  templateId?: string;
  duplicateFromId?: string;
  createdBy: string;
}

/** Parameters for updating a question */
export interface UpdateQuestionParams {
  id: string;
  text?: string;
  description?: string | null;
  reverseScored?: boolean;
  diagnosticFocus?: string | null;
  recommendedAction?: string | null;
  subDimensionId?: string | null;
}

/** Parameters for reordering questions */
export interface ReorderQuestionParams {
  questionId: string;
  newOrder: number;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Fetch all surveys for an organization with response counts */
export async function listSurveys(
  organizationId: string,
  statusFilter?: SurveyStatus,
): Promise<SurveyListItem[]> {
  let query = supabase
    .from('surveys')
    .select('*, deployments(responses(count))')
    .order('updated_at', { ascending: false });

  // CC+C admins pass empty org ID to see all surveys (RLS enforces access)
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const deployments = raw['deployments'] as Array<{ responses: Array<{ count: number }> }> | undefined;
    const responseCount = deployments?.reduce(
      (sum, d) => sum + (d.responses?.[0]?.count ?? 0), 0,
    ) ?? 0;
    return {
      ...mapSurveyRow(raw),
      responseCount,
      completionPercent: 0, // Calculated server-side if needed
    };
  });
}

/** Fetch a single survey with questions, dimensions, and response status */
export async function getSurveyBuilderData(surveyId: string): Promise<SurveyBuilderData> {
  const [surveyResult, questionsResult, dimensionsResult, subDimensionsResult, responsesResult] = await Promise.all([
    supabase.from('surveys').select('*').eq('id', surveyId).single(),
    supabase
      .from('questions')
      .select('*, question_dimensions(*)')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true }),
    supabase.from('dimensions').select('*').order('display_order', { ascending: true }),
    supabase.from('sub_dimensions').select('*').order('display_order', { ascending: true }),
    supabase
      .from('deployments')
      .select('responses(id)', { count: 'exact', head: true })
      .eq('survey_id', surveyId),
  ]);

  if (surveyResult.error) throw surveyResult.error;
  if (questionsResult.error) throw questionsResult.error;
  if (dimensionsResult.error) throw dimensionsResult.error;
  if (subDimensionsResult.error) throw subDimensionsResult.error;

  const survey = mapSurveyRow(surveyResult.data as Record<string, unknown>);
  const dimensions = (dimensionsResult.data ?? []).map(mapDimensionRow);
  const subDimensions = (subDimensionsResult.data ?? []).map(mapSubDimensionRow);

  const subDimMap = new Map(subDimensions.map((sd) => [sd.id, sd]));

  const questions: QuestionWithDimension[] = (questionsResult.data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const qdArr = raw['question_dimensions'] as Array<Record<string, unknown>> | undefined;
    const qd = qdArr?.[0];
    const mapped = mapQuestionRow(raw);
    return {
      ...mapped,
      dimension: {
        id: (qd?.['id'] as string) ?? '',
        questionId: (qd?.['question_id'] as string) ?? '',
        dimensionId: (qd?.['dimension_id'] as string) ?? '',
        weight: (qd?.['weight'] as number) ?? 1,
      },
      subDimension: mapped.subDimensionId ? (subDimMap.get(mapped.subDimensionId) ?? null) : null,
    };
  });

  return {
    survey,
    questions,
    dimensions,
    subDimensions,
    hasResponses: (responsesResult.count ?? 0) > 0,
  };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a new survey, optionally from a template or by duplicating an existing one */
export async function createSurvey(params: CreateSurveyParams): Promise<Survey> {
  const { organizationId, title, templateId, duplicateFromId, createdBy } = params;

  // Create the survey record
  const { data: surveyData, error: surveyError } = await supabase
    .from('surveys')
    .insert({
      organization_id: organizationId,
      title,
      status: 'draft',
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (surveyError) throw surveyError;

  const survey = mapSurveyRow(surveyData as Record<string, unknown>);

  // Copy questions from template or existing survey.
  // When neither is specified, fall back to the system template so new surveys
  // are pre-populated with the standard ~56 question bank.
  if (templateId) {
    await copyQuestionsFromTemplate(survey.id, templateId);
  } else if (duplicateFromId) {
    await copyQuestionsFromSurvey(survey.id, duplicateFromId);
  } else {
    const systemTemplateId = await resolveSystemTemplateId();
    if (systemTemplateId) {
      await copyQuestionsFromTemplate(survey.id, systemTemplateId);
    }
  }

  return survey;
}

/** Update a question's editable fields */
export async function updateQuestion(params: UpdateQuestionParams): Promise<Question> {
  const { id, ...updates } = params;

  const dbUpdates: Record<string, unknown> = {};
  if (updates.text !== undefined) dbUpdates['text'] = updates.text;
  if (updates.description !== undefined) dbUpdates['description'] = updates.description;
  if (updates.reverseScored !== undefined) dbUpdates['reverse_scored'] = updates.reverseScored;
  if (updates.diagnosticFocus !== undefined) dbUpdates['diagnostic_focus'] = updates.diagnosticFocus;
  if (updates.recommendedAction !== undefined) {
    dbUpdates['recommended_action'] = updates.recommendedAction;
  }
  if (updates.subDimensionId !== undefined) {
    dbUpdates['sub_dimension_id'] = updates.subDimensionId;
  }

  const { data, error } = await supabase
    .from('questions')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return mapQuestionRow(data as Record<string, unknown>);
}

/** Reorder questions by updating order_index values */
export async function reorderQuestions(
  surveyId: string,
  reorders: ReorderQuestionParams[],
): Promise<void> {
  // Update each question's order_index in a batch
  const updates = reorders.map(({ questionId, newOrder }) =>
    supabase
      .from('questions')
      .update({ order_index: newOrder })
      .eq('id', questionId)
      .eq('survey_id', surveyId),
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

/** Update survey status */
export async function updateSurveyStatus(
  surveyId: string,
  status: SurveyStatus,
): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ status })
    .eq('id', surveyId);

  if (error) throw error;
}

/** Fetch available survey templates */
export async function listTemplates(
  organizationId: string,
): Promise<SurveyTemplate[]> {
  const { data, error } = await supabase
    .from('survey_templates')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system.eq.true`)
    .eq('is_active', true);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      id: raw['id'] as string,
      name: raw['name'] as string,
      description: (raw['description'] as string) ?? null,
      organizationId: (raw['organization_id'] as string) ?? null,
      questions: raw['questions'] ?? null,
      settings: (raw['settings'] as SurveyTemplate['settings']) ?? null,
      isSystem: (raw['is_system'] as boolean) ?? false,
      isActive: (raw['is_active'] as boolean) ?? true,
    };
  });
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/** Cached system template ID — resolved once per session */
let _systemTemplateId: string | null | undefined;

/** Look up the single active system template (is_system=true, is_active=true) */
async function resolveSystemTemplateId(): Promise<string | null> {
  if (_systemTemplateId !== undefined) return _systemTemplateId;

  const { data, error } = await supabase
    .from('survey_templates')
    .select('id')
    .eq('is_system', true)
    .eq('is_active', true)
    .limit(1)
    .single();

  _systemTemplateId = error || !data ? null : (data.id as string);
  return _systemTemplateId;
}

async function copyQuestionsFromTemplate(
  targetSurveyId: string,
  templateId: string,
): Promise<void> {
  const { data: template, error } = await supabase
    .from('survey_templates')
    .select('questions')
    .eq('id', templateId)
    .single();

  if (error || !template) return;

  const templateQuestions = template.questions as Array<Record<string, unknown>> | null;
  if (!templateQuestions?.length) return;

  const questionInserts = templateQuestions.map((q, index) => ({
    survey_id: targetSurveyId,
    text: q['text'] as string,
    type: (q['type'] as string) ?? 'likert',
    reverse_scored: (q['reverse_scored'] as boolean) ?? false,
    required: (q['required'] as boolean) ?? true,
    order_index: index + 1,
    sub_dimension_id: (q['sub_dimension_id'] as string) ?? null,
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionInserts)
    .select('id');

  if (insertError || !insertedQuestions) return;

  // Map dimension assignments from template.
  // Each template question carries a `dimensions` array to support multi-dimension
  // mappings (e.g. the S4 pride question maps to all 4 dimensions at 0.25 weight).
  // Falls back to the legacy single `dimension_id` field for backwards compatibility.
  const dimensionMappings: Array<{ question_id: string; dimension_id: string; weight: number }> = [];

  insertedQuestions.forEach((inserted, index) => {
    const templateQ = templateQuestions[index];
    const dims = templateQ?.['dimensions'] as Array<Record<string, unknown>> | undefined;

    if (dims?.length) {
      for (const d of dims) {
        dimensionMappings.push({
          question_id: inserted.id as string,
          dimension_id: d['dimension_id'] as string,
          weight: (d['weight'] as number) ?? 1,
        });
      }
    } else {
      const dimId = templateQ?.['dimension_id'] as string | undefined;
      if (dimId) {
        dimensionMappings.push({
          question_id: inserted.id as string,
          dimension_id: dimId,
          weight: (templateQ?.['weight'] as number) ?? 1,
        });
      }
    }
  });

  if (dimensionMappings.length > 0) {
    await supabase.from('question_dimensions').insert(dimensionMappings);
  }
}

async function copyQuestionsFromSurvey(
  targetSurveyId: string,
  sourceSurveyId: string,
): Promise<void> {
  const { data: sourceQuestions, error } = await supabase
    .from('questions')
    .select('*, question_dimensions(*)')
    .eq('survey_id', sourceSurveyId)
    .order('order_index', { ascending: true });

  if (error || !sourceQuestions?.length) return;

  const questionInserts = sourceQuestions.map((q) => {
    const raw = q as Record<string, unknown>;
    return {
      survey_id: targetSurveyId,
      text: raw['text'] as string,
      type: (raw['type'] as string) ?? 'likert',
      reverse_scored: (raw['reverse_scored'] as boolean) ?? false,
      required: (raw['required'] as boolean) ?? true,
      order_index: raw['order_index'] as number,
      sub_dimension_id: (raw['sub_dimension_id'] as string) ?? null,
    };
  });

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionInserts)
    .select('id');

  if (insertError || !insertedQuestions) return;

  const dimensionMappings = insertedQuestions
    .map((inserted, index) => {
      const sourceQ = sourceQuestions[index] as Record<string, unknown>;
      const qdArr = sourceQ['question_dimensions'] as Array<Record<string, unknown>> | undefined;
      const qd = qdArr?.[0];
      if (!qd) return null;
      return {
        question_id: inserted.id as string,
        dimension_id: qd['dimension_id'] as string,
        weight: (qd['weight'] as number) ?? 1,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (dimensionMappings.length > 0) {
    await supabase.from('question_dimensions').insert(dimensionMappings);
  }
}