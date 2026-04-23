/**
 * Supabase implementation of the SurveyEngineService interface.
 * Handles deployment resolution and response resumption via session tokens.
 */
import type {
  Database,
  SurveyEngineService,
  DeploymentResolution,
  SurveyResponse,
  MetadataConfig,
  QuestionWithDimension,
  LikertValue,
} from '@compass/types';

type ResponseInsert = Database['public']['Tables']['responses']['Insert'];
type SurveyRow = Database['public']['Tables']['surveys']['Row'];
type DeploymentRow = Database['public']['Tables']['deployments']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type AnswerRow = Database['public']['Tables']['answers']['Row'];
type ResponseRow = Database['public']['Tables']['responses']['Row'];

/**
 * Generated question Row is narrower than the runtime schema — these columns
 * exist in the database (see migrations) but are not yet reflected in the
 * generated types. Tracked for regeneration.
 */
type QuestionRowWithDrift = QuestionRow & {
  description?: string | null;
  options?: unknown;
  diagnostic_focus?: string | null;
  recommended_action?: string | null;
  updated_at?: string;
};

/** Joined shape returned by the getQuestions select: question + its dimensions. */
type QuestionRowWithDimensions = QuestionRowWithDrift & {
  question_dimensions?: Array<{
    id?: string;
    question_id: string;
    dimension_id: string;
    weight?: number;
  }> | {
    id?: string;
    question_id: string;
    dimension_id: string;
    weight?: number;
  } | null;
};

/** Joined shape returned by resolveDeployment: deployment + its survey. */
type DeploymentWithSurveyRow = DeploymentRow & {
  survey: SurveyRow | null;
};

/** Joined shape returned by resumeResponse: response + its answers. */
type ResponseWithAnswersRow = ResponseRow & {
  answers: Array<Pick<AnswerRow, 'question_id' | 'likert_value' | 'open_text_value'>>;
};

import { DEFAULT_METADATA_CONFIG } from '@compass/types';
import { formatDisplayDate } from '@compass/utils';
import { supabase, surveySessionClient } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { mapSurveyRow, mapDeploymentRow, mapQuestionRow } from '../../../lib/mappers/survey-mappers';

/**
 * Create a partial SurveyEngineService backed by Supabase.
 * Covers deployment resolution and session-based response lookup.
 */
export function createSurveyEngineAdapter(): Pick<
  SurveyEngineService,
  'resolveDeployment' | 'resumeResponse' | 'getMetadataConfig' | 'saveResponse' | 'getQuestions'
> & {
  upsertAnswer: (responseId: string, questionId: string, value: LikertValue | string) => Promise<void>;
  submitResponse: (responseId: string) => Promise<void>;
} {
  return {
    async resolveDeployment(token: string): Promise<DeploymentResolution> {
      const { data: deployment, error: deploymentError } = await supabase
        .from('deployments')
        .select('*, survey:surveys(*)')
        .eq('token', token)
        .single();

      if (deploymentError || !deployment) {
        if (deploymentError) {
          logger.error(
            { err: deploymentError, fn: 'resolveDeployment', token },
            'Failed to resolve deployment token',
          );
        }
        return { status: 'not_found', message: 'This survey link is not valid.' };
      }

      const row = deployment as DeploymentWithSurveyRow;
      const survey = row.survey;

      if (!survey) {
        return { status: 'not_found', message: 'The survey associated with this link could not be found.' };
      }

      // Status evaluation order matters — a closed survey must always resolve
      // to `closed` even if its deployment also has `closes_at` in the past,
      // otherwise an orphaned/expired-looking row would mask the real reason.
      // See QA flows 2.7 and 2.8.
      const surveyStatus = survey.status;
      const deploymentClosesAt = row.closes_at;
      const deploymentOpensAt = row.opens_at;

      // 1. Survey administratively closed or archived.
      if (surveyStatus === 'closed' || surveyStatus === 'archived') {
        const closesAt = deploymentClosesAt ?? survey.closes_at ?? null;
        return {
          status: 'closed',
          message: `This survey closed on ${formatDisplayDate(closesAt, 'long', { nullFallback: 'an unknown date' })}.`,
          closesAt,
        };
      }

      // 2. Deployment window has closed.
      if (deploymentClosesAt && new Date(deploymentClosesAt) < new Date()) {
        return {
          status: 'expired',
          message: `This survey link expired on ${formatDisplayDate(deploymentClosesAt, 'long', { nullFallback: 'an unknown date' })}.`,
          closesAt: deploymentClosesAt,
        };
      }

      // 3. Deployment window has not opened yet.
      if (deploymentOpensAt && new Date(deploymentOpensAt) > new Date()) {
        return {
          status: 'not_yet_open',
          message: `This survey opens on ${formatDisplayDate(deploymentOpensAt, 'long', { nullFallback: 'an unknown date' })}.`,
          opensAt: deploymentOpensAt,
        };
      }

      // 4. already_completed cookie check happens inside SurveyLayoutInner
      // once the deployment is known to be valid — the adapter does not have
      // access to request cookies.

      // 5. Default → valid deployment.
      return {
        status: 'valid',
        deployment: mapDeploymentRow(row),
        survey: mapSurveyRow(survey),
      };
    },

    async resumeResponse(
      deploymentId: string,
      sessionToken: string,
    ): Promise<SurveyResponse | null> {
      // Anon SELECT on `responses` and `answers` requires an `x-session-token`
      // header matching the row's `session_token` (migration 39). The module-
      // level `supabase` client doesn't send it, so we build a short-lived
      // client scoped to this respondent session.
      const client = surveySessionClient(sessionToken);
      const { data, error } = await client
        .from('responses')
        .select('*, answers(question_id, likert_value, open_text_value)')
        .eq('deployment_id', deploymentId)
        .eq('id', sessionToken)
        .maybeSingle();

      if (error) {
        logger.error(
          { err: error, fn: 'resumeResponse', deploymentId },
          'Failed to resume survey response',
        );
      }

      if (error || !data) {
        return null;
      }

      return mapResponseWithAnswers(data as ResponseWithAnswersRow);
    },

    async getMetadataConfig(organizationId: string): Promise<MetadataConfig> {
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (error) {
        logger.error(
          { err: error, fn: 'getMetadataConfig', organizationId },
          'Failed to read organization settings — falling back to defaults',
        );
      }

      if (error || !data?.settings) {
        return { ...DEFAULT_METADATA_CONFIG };
      }

      // The `settings` column is JSONB; narrow it to the one nested key this
      // function cares about without going through `Record<string, unknown>`.
      const settings = data.settings as { metadataConfig?: Partial<MetadataConfig> };
      const orgConfig = settings?.metadataConfig;

      if (!orgConfig) {
        return { ...DEFAULT_METADATA_CONFIG };
      }

      return {
        departments: orgConfig.departments?.length
          ? orgConfig.departments
          : DEFAULT_METADATA_CONFIG.departments,
        roles: orgConfig.roles?.length
          ? orgConfig.roles
          : DEFAULT_METADATA_CONFIG.roles,
        locations: orgConfig.locations?.length
          ? orgConfig.locations
          : DEFAULT_METADATA_CONFIG.locations,
        tenures: orgConfig.tenures?.length
          ? orgConfig.tenures
          : DEFAULT_METADATA_CONFIG.tenures,
      };
    },

    async saveResponse(
      params: Pick<SurveyResponse, 'surveyId' | 'deploymentId' | 'answers' | 'metadata'> & {
        responseId?: string;
        sessionToken?: string;
      },
    ): Promise<{ responseId: string }> {
      const metadataColumns = params.metadata
        ? {
            metadata_department: params.metadata.department ?? null,
            metadata_role: params.metadata.role ?? null,
            metadata_location: params.metadata.location ?? null,
            metadata_tenure: params.metadata.tenure ?? null,
          }
        : {};

      if (params.responseId) {
        // Anon UPDATE on `responses` returns representation by default, which
        // runs the SELECT policy that requires `x-session-token` (migration
        // 39). responseId === sessionToken, so use the scoped client.
        const client = surveySessionClient(params.responseId);
        const { error } = await client
          .from('responses')
          .update(metadataColumns)
          .eq('id', params.responseId);

        if (error) {
          logger.error(
            { err: error, fn: 'saveResponse.update', responseId: params.responseId },
            'Failed to update existing survey response',
          );
          throw new Error(`Failed to update response: ${error.message}`);
        }

        return { responseId: params.responseId };
      }

      // Use the session token as the response ID so that
      // sessionToken === responseId throughout the survey flow.
      const responseId = params.sessionToken || crypto.randomUUID();

      // deployment_id is non-null in the DB; the domain type widens it to
      // string | null for in-memory drafts. Reject the insert up-front so the
      // DB's NOT NULL constraint is not the first line of defense.
      if (!params.deploymentId) {
        throw new Error('Cannot save response without a deployment ID.');
      }

      const row: ResponseInsert = {
        id: responseId,
        deployment_id: params.deploymentId,
        session_token: responseId,
        ...metadataColumns,
      };

      const { error } = await supabase.from('responses').insert(row);

      if (error) {
        logger.error(
          { err: error, fn: 'saveResponse.insert', responseId, deploymentId: params.deploymentId },
          'Failed to create new survey response',
        );
        throw new Error(`Failed to create response: ${error.message}`);
      }

      return { responseId };
    },

    async getQuestions(surveyId: string): Promise<QuestionWithDimension[]> {
      const { data, error } = await supabase
        .from('questions')
        .select('*, question_dimensions(question_id, dimension_id, weight)')
        .eq('survey_id', surveyId)
        .order('order_index', { ascending: true });

      if (error) {
        logger.error(
          { err: error, fn: 'getQuestions', surveyId },
          'Failed to load survey questions',
        );
        throw new Error(`Failed to load questions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return (data as QuestionRowWithDimensions[]).map((row) => {
        const qdRaw = row.question_dimensions;
        const qd = Array.isArray(qdRaw) ? qdRaw[0] : qdRaw ?? undefined;

        const base = mapQuestionRow(row);
        return {
          ...base,
          dimension: qd
            ? {
                id: qd.id ?? '',
                questionId: qd.question_id,
                dimensionId: qd.dimension_id,
                weight: qd.weight ?? 1,
              }
            : { id: '', questionId: base.id, dimensionId: '', weight: 1 },
          subDimension: null,
        } satisfies QuestionWithDimension;
      });
    },

    async submitResponse(responseId: string): Promise<void> {
      // responseId === session_token; use the scoped client so the update's
      // returning SELECT can pass the session-token RLS check.
      const client = surveySessionClient(responseId);
      const { error } = await client
        .from('responses')
        .update({ is_complete: true, submitted_at: new Date().toISOString() })
        .eq('id', responseId)
        .eq('is_complete', false);

      if (error) {
        logger.error(
          { err: error, fn: 'submitResponse', responseId },
          'Failed to mark survey response as complete',
        );
        throw new Error(`Failed to submit response: ${error.message}`);
      }
    },

    async upsertAnswer(
      responseId: string,
      questionId: string,
      value: LikertValue | string,
    ): Promise<void> {
      const isLikert = typeof value === 'number';

      const row = {
        response_id: responseId,
        question_id: questionId,
        ...(isLikert
          ? { likert_value: value, open_text_value: null }
          : { likert_value: null, open_text_value: value }),
      };

      // responseId === session_token. The module-level `supabase` client
      // persists auth sessions, so a stale admin/client login in the same
      // browser tab sends `Authorization: Bearer …`, flipping auth.role() to
      // `authenticated` and routing writes through the authenticated SELECT
      // policy — which requires `x-session-token` per migration 39. Use the
      // scoped client (no persisted auth, session-token header set) so the
      // upsert's returning SELECT passes RLS regardless of tab state.
      const client = surveySessionClient(responseId);
      const { error } = await client
        .from('answers')
        .upsert(row, { onConflict: 'response_id,question_id' });

      if (error) {
        logger.error(
          { err: error, fn: 'upsertAnswer', responseId, questionId },
          'Failed to upsert survey answer',
        );
        throw new Error(`Failed to save answer: ${error.message}`);
      }
    },
  };
}

/**
 * Map a response row with its joined answers.
 *
 * `surveyId`, `completedAt`, `userAgent`, `metadata`, and `updatedAt` are part
 * of the in-memory `SurveyResponse` domain type but are not columns on the
 * `responses` table (metadata is stored per-field as `metadata_department`,
 * etc., and the remaining fields are derived elsewhere). Placeholders are used
 * here so the function returns the full domain shape.
 */
function mapResponseWithAnswers(row: ResponseWithAnswersRow): SurveyResponse {
  const answers: Record<string, LikertValue | string> = {};

  for (const a of row.answers ?? []) {
    if (a.likert_value != null) {
      answers[a.question_id] = a.likert_value as LikertValue;
    } else if (a.open_text_value != null) {
      answers[a.question_id] = a.open_text_value;
    }
  }

  return {
    id: row.id,
    surveyId: '',
    deploymentId: row.deployment_id,
    answers,
    metadata: {
      department: row.metadata_department ?? '',
      role: row.metadata_role ?? '',
      location: row.metadata_location ?? '',
      tenure: row.metadata_tenure ?? '',
    },
    completedAt: row.submitted_at ?? null,
    ipHash: row.ip_hash ?? null,
    userAgent: null,
    createdAt: row.created_at,
    updatedAt: row.started_at,
  };
}
