import { createAdminClient } from './db';

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';
const SEED_ORG_ID = '00000000-0000-0000-0000-000000000002';

interface ActiveDeployment {
  token: string;
  deploymentId: string;
}

/**
 * Creates an active deployment for the seed survey.
 * Returns the token (UUID) used in the survey URL path.
 */
export async function createActiveDeployment(): Promise<ActiveDeployment> {
  const supabase = createAdminClient();

  // Ensure the survey is active
  const { error: surveyError } = await supabase
    .from('surveys')
    .update({ status: 'active' })
    .eq('id', SEED_SURVEY_ID);

  if (surveyError) {
    throw new Error(`Failed to activate survey: ${surveyError.message}`);
  }

  // Insert a new deployment
  const { data, error } = await supabase
    .from('deployments')
    .insert({
      survey_id: SEED_SURVEY_ID,
      type: 'anonymous_link',
      is_active: true,
      opens_at: new Date(Date.now() - 86_400_000).toISOString(), // opened yesterday
    })
    .select('id, token')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create deployment: ${error?.message}`);
  }

  return { token: data.token as string, deploymentId: data.id as string };
}

/**
 * Cleans up a deployment and its associated responses/answers.
 */
export async function cleanupDeployment(deploymentId: string): Promise<void> {
  const supabase = createAdminClient();

  // Delete in order: answers → responses → deployment
  const { data: responses } = await supabase
    .from('responses')
    .select('id')
    .eq('deployment_id', deploymentId);

  if (responses && responses.length > 0) {
    const responseIds = responses.map((r) => r.id as string);
    await supabase.from('answers').delete().in('response_id', responseIds);
    await supabase.from('responses').delete().eq('deployment_id', deploymentId);
  }

  await supabase.from('deployments').delete().eq('id', deploymentId);
}

export { SEED_SURVEY_ID, SEED_ORG_ID };
