/**
 * Supabase queries for admin survey management.
 * Handles CRUD operations for surveys, questions, and template-based creation.
 */

import type {
  Database,
  Survey,
  SurveyStatus,
  Question,
  QuestionWithDimension,
  Dimension,
  SubDimension,
  SurveyTemplate,
} from '@compass/types';
import { getClient, getLogger } from '../runtime';
import { mapSurveyRow, mapQuestionRow, mapDimensionRow, mapSubDimensionRow } from '../lib/mappers';

type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
type QuestionType = Database['public']['Enums']['question_type'];
type SurveyRow = Database['public']['Tables']['surveys']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type SurveyTemplateRow = Database['public']['Tables']['survey_templates']['Row'];

type QuestionRowWithDrift = QuestionRow & {
  description?: string | null;
  options?: unknown;
  diagnostic_focus?: string | null;
  recommended_action?: string | null;
  updated_at?: string;
};

type QuestionRowWithDimensions = QuestionRowWithDrift & {
  question_dimensions?: Array<{
    id?: string;
    question_id: string;
    dimension_id: string;
    weight: number;
  }>;
};

type TemplateQuestionEntry = {
  text: string;
  type?: QuestionType;
  reverse_scored?: boolean;
  required?: boolean;
  sub_dimension_id?: string | null;
  dimension_id?: string;
  weight?: number;
  dimensions?: Array<{ dimension_id: string; weight?: number }>;
};

type SurveyRowWithDeployments = SurveyRow & {
  deployments?: Array<{
    token: string;
    is_active: boolean;
    responses?: Array<{ count: number }>;
  }>;
  scores_calculated_at?: string | null;
};

export interface SurveyListItem extends Survey {
  responseCount: number;
  completionPercent: number;
  activeDeploymentToken: string | null;
}

export interface SurveyBuilderData {
  survey: Survey;
  questions: QuestionWithDimension[];
  dimensions: Dimension[];
  subDimensions: SubDimension[];
  hasResponses: boolean;
}

export interface CreateSurveyParams {
  organizationId: string;
  title: string;
  templateId?: string;
  duplicateFromId?: string;
  createdBy: string;
}

export interface UpdateQuestionParams {
  id: string;
  text?: string;
  description?: string | null;
  reverseScored?: boolean;
  diagnosticFocus?: string | null;
  recommendedAction?: string | null;
  subDimensionId?: string | null;
}

export interface ReorderQuestionParams {
  questionId: string;
  newOrder: number;
}

export async function listSurveys(
  organizationId: string,
  statusFilter?: SurveyStatus,
): Promise<SurveyListItem[]> {
  const supabase = getClient();
  const logger = getLogger();
  let query = supabase
    .from('surveys')
    .select('*, deployments(token, is_active, responses(count))')
    .order('updated_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    logger.error(
      { err: error, fn: 'listSurveys', organizationId, statusFilter },
      'Failed to list surveys',
    );
    throw error;
  }

  return ((data ?? []) as SurveyRowWithDeployments[]).map((row) => {
    const deployments = row.deployments;
    const responseCount = deployments?.reduce(
      (sum, d) => sum + (d.responses?.[0]?.count ?? 0), 0,
    ) ?? 0;
    const activeDeployment = deployments?.find((d) => d.is_active);
    return {
      ...mapSurveyRow(row),
      responseCount,
      completionPercent: 0,
      activeDeploymentToken: activeDeployment?.token ?? null,
    };
  });
}

export async function getSurveyBuilderData(surveyId: string): Promise<SurveyBuilderData> {
  const supabase = getClient();
  const logger = getLogger();
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

  if (surveyResult.error) {
    logger.error({ err: surveyResult.error, fn: 'getSurveyBuilderData.survey', surveyId }, 'Failed to load survey');
    throw surveyResult.error;
  }
  if (questionsResult.error) {
    logger.error({ err: questionsResult.error, fn: 'getSurveyBuilderData.questions', surveyId }, 'Failed to load questions');
    throw questionsResult.error;
  }
  if (dimensionsResult.error) {
    logger.error({ err: dimensionsResult.error, fn: 'getSurveyBuilderData.dimensions', surveyId }, 'Failed to load dimensions');
    throw dimensionsResult.error;
  }
  if (subDimensionsResult.error) {
    logger.error({ err: subDimensionsResult.error, fn: 'getSurveyBuilderData.subDimensions', surveyId }, 'Failed to load sub-dimensions');
    throw subDimensionsResult.error;
  }

  const survey = mapSurveyRow(surveyResult.data);
  const dimensions = (dimensionsResult.data ?? []).map(mapDimensionRow);
  const subDimensions = (subDimensionsResult.data ?? []).map(mapSubDimensionRow);

  const subDimMap = new Map(subDimensions.map((sd) => [sd.id, sd]));

  const questions: QuestionWithDimension[] = ((questionsResult.data ?? []) as QuestionRowWithDimensions[]).map((row) => {
    const qd = row.question_dimensions?.[0];
    const mapped = mapQuestionRow(row);
    return {
      ...mapped,
      dimension: {
        id: qd?.id ?? '',
        questionId: qd?.question_id ?? '',
        dimensionId: qd?.dimension_id ?? '',
        weight: qd?.weight ?? 1,
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

export async function createSurvey(params: CreateSurveyParams): Promise<Survey> {
  const supabase = getClient();
  const logger = getLogger();
  const { organizationId, title, templateId, duplicateFromId, createdBy } = params;

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

  if (surveyError) {
    logger.error(
      { err: surveyError, fn: 'createSurvey', organizationId, title },
      'Failed to insert new survey',
    );
    throw surveyError;
  }

  const survey = mapSurveyRow(surveyData);

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

export async function updateQuestion(params: UpdateQuestionParams): Promise<Question> {
  const supabase = getClient();
  const logger = getLogger();
  const { id, ...updates } = params;

  type QuestionUpdate = Database['public']['Tables']['questions']['Update'] & {
    description?: string | null;
    diagnostic_focus?: string | null;
    recommended_action?: string | null;
  };

  const dbUpdates: QuestionUpdate = {};
  if (updates.text !== undefined) dbUpdates.text = updates.text;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.reverseScored !== undefined) dbUpdates.reverse_scored = updates.reverseScored;
  if (updates.diagnosticFocus !== undefined) dbUpdates.diagnostic_focus = updates.diagnosticFocus;
  if (updates.recommendedAction !== undefined) {
    dbUpdates.recommended_action = updates.recommendedAction;
  }
  if (updates.subDimensionId !== undefined) {
    dbUpdates.sub_dimension_id = updates.subDimensionId;
  }

  const { data, error } = await supabase
    .from('questions')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logger.error({ err: error, fn: 'updateQuestion', questionId: id }, 'Failed to update question');
    throw error;
  }

  return mapQuestionRow(data);
}

export async function reorderQuestions(
  surveyId: string,
  reorders: ReorderQuestionParams[],
): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error } = await supabase.rpc('reorder_questions', {
    p_survey_id: surveyId,
    p_question_ids: reorders.map((r) => r.questionId),
    p_new_orders: reorders.map((r) => r.newOrder),
  });
  if (error) {
    logger.error({ err: error, fn: 'reorderQuestions', surveyId }, 'Failed to reorder questions');
    throw error;
  }
}

export async function updateSurveyStatus(
  surveyId: string,
  status: SurveyStatus,
): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { error } = await supabase
    .from('surveys')
    .update({ status })
    .eq('id', surveyId);

  if (error) {
    logger.error({ err: error, fn: 'updateSurveyStatus', surveyId, status }, 'Failed to update survey status');
    throw error;
  }
}

export async function listTemplates(
  organizationId: string,
): Promise<SurveyTemplate[]> {
  const supabase = getClient();
  const logger = getLogger();
  const { data, error } = await supabase
    .from('survey_templates')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_system.eq.true`)
    .eq('is_active', true);

  if (error) {
    logger.error({ err: error, fn: 'listTemplates', organizationId }, 'Failed to list survey templates');
    throw error;
  }

  return ((data ?? []) as SurveyTemplateRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    organizationId: row.organization_id ?? null,
    questions: row.questions ?? null,
    settings: (row.settings as SurveyTemplate['settings']) ?? null,
    isSystem: row.is_system ?? false,
    isActive: row.is_active ?? true,
  }));
}

let _systemTemplateId: string | null | undefined;

async function resolveSystemTemplateId(): Promise<string | null> {
  if (_systemTemplateId !== undefined) return _systemTemplateId;
  const supabase = getClient();

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
  const supabase = getClient();
  const logger = getLogger();
  const { data: template, error } = await supabase
    .from('survey_templates')
    .select('questions')
    .eq('id', templateId)
    .single();

  if (error) {
    logger.error(
      { err: error, fn: 'copyQuestionsFromTemplate', templateId, targetSurveyId },
      'Failed to read template questions — skipping copy',
    );
    return;
  }
  if (!template) return;

  const templateQuestions = (template.questions as TemplateQuestionEntry[] | null) ?? null;
  if (!templateQuestions?.length) return;

  const questionInserts: QuestionInsert[] = templateQuestions.map((q, index) => ({
    survey_id: targetSurveyId,
    text: q.text,
    type: q.type ?? 'likert',
    reverse_scored: q.reverse_scored ?? false,
    required: q.required ?? true,
    order_index: index + 1,
    sub_dimension_id: q.sub_dimension_id ?? null,
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionInserts)
    .select('id');

  if (insertError) {
    logger.error(
      { err: insertError, fn: 'copyQuestionsFromTemplate.insertQuestions', templateId, targetSurveyId },
      'Failed to insert copied questions',
    );
    return;
  }
  if (!insertedQuestions) return;

  const dimensionMappings: Array<{ question_id: string; dimension_id: string; weight: number }> = [];

  insertedQuestions.forEach((inserted, index) => {
    const templateQ = templateQuestions[index];
    const dims = templateQ?.dimensions;

    if (dims?.length) {
      for (const d of dims) {
        dimensionMappings.push({
          question_id: inserted.id,
          dimension_id: d.dimension_id,
          weight: d.weight ?? 1,
        });
      }
    } else {
      const dimId = templateQ?.dimension_id;
      if (dimId) {
        dimensionMappings.push({
          question_id: inserted.id,
          dimension_id: dimId,
          weight: templateQ?.weight ?? 1,
        });
      }
    }
  });

  if (dimensionMappings.length > 0) {
    const { error: mappingError } = await supabase.from('question_dimensions').insert(dimensionMappings);
    if (mappingError) {
      logger.error(
        { err: mappingError, fn: 'copyQuestionsFromTemplate.insertMappings', targetSurveyId },
        'Failed to insert dimension mappings for copied questions',
      );
    }
  }
}

async function copyQuestionsFromSurvey(
  targetSurveyId: string,
  sourceSurveyId: string,
): Promise<void> {
  const supabase = getClient();
  const logger = getLogger();
  const { data: sourceQuestions, error } = await supabase
    .from('questions')
    .select('*, question_dimensions(*)')
    .eq('survey_id', sourceSurveyId)
    .order('order_index', { ascending: true });

  if (error) {
    logger.error(
      { err: error, fn: 'copyQuestionsFromSurvey.fetch', sourceSurveyId, targetSurveyId },
      'Failed to read source questions — skipping duplicate',
    );
    return;
  }
  if (!sourceQuestions?.length) return;

  const typedSourceQuestions = sourceQuestions as QuestionRowWithDimensions[];

  const questionInserts: QuestionInsert[] = typedSourceQuestions.map((q) => ({
    survey_id: targetSurveyId,
    text: q.text,
    type: q.type ?? 'likert',
    reverse_scored: q.reverse_scored ?? false,
    required: q.required ?? true,
    order_index: q.order_index,
    sub_dimension_id: q.sub_dimension_id ?? null,
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionInserts)
    .select('id');

  if (insertError) {
    logger.error(
      { err: insertError, fn: 'copyQuestionsFromSurvey.insertQuestions', sourceSurveyId, targetSurveyId },
      'Failed to insert duplicated questions',
    );
    return;
  }
  if (!insertedQuestions) return;

  const dimensionMappings = insertedQuestions
    .map((inserted, index) => {
      const sourceQ = typedSourceQuestions[index];
      const qd = sourceQ?.question_dimensions?.[0];
      if (!qd) return null;
      return {
        question_id: inserted.id,
        dimension_id: qd.dimension_id,
        weight: qd.weight ?? 1,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (dimensionMappings.length > 0) {
    const { error: mappingError } = await supabase.from('question_dimensions').insert(dimensionMappings);
    if (mappingError) {
      logger.error(
        { err: mappingError, fn: 'copyQuestionsFromSurvey.insertMappings', targetSurveyId },
        'Failed to insert dimension mappings for duplicated questions',
      );
    }
  }
}
