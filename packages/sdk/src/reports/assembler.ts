/**
 * Assembles the data payload required for report rendering.
 * Queries Supabase for survey details, scores, recommendations,
 * and branding, then maps DB snake_case to camelCase.
 */

import type { ReportConfig, ReportPayload } from '@compass/types';
import { getClient } from '../runtime';

export async function assembleReportPayload(config: ReportConfig): Promise<ReportPayload> {
  const supabase = getClient();
  const includedSections = config.sections.filter((s) => s.included);

  const [
    surveyResult,
    orgResult,
    scoresResult,
    segmentScoresResult,
    recommendationsResult,
    responseCountResult,
  ] = await Promise.all([
    supabase.from('surveys').select('*').eq('id', config.surveyId).single(),
    fetchOrganizationForSurvey(config.surveyId),
    supabase
      .from('scores')
      .select('*, dimensions!inner(code, name)')
      .eq('survey_id', config.surveyId)
      .is('segment_type', null),
    supabase
      .from('safe_segment_scores')
      .select('*')
      .eq('survey_id', config.surveyId),
    supabase
      .from('recommendations')
      .select('*')
      .eq('survey_id', config.surveyId)
      .order('severity_rank', { ascending: true }),
    supabase
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', config.surveyId),
  ]);

  if (surveyResult.error) throw surveyResult.error;
  if (scoresResult.error) throw scoresResult.error;
  if (segmentScoresResult.error) throw segmentScoresResult.error;
  if (recommendationsResult.error) throw recommendationsResult.error;

  const surveyRow = surveyResult.data as Record<string, unknown>;

  if (!(surveyRow['scores_calculated'] as boolean)) {
    throw new Error('Survey scores have not been calculated. Run scoring before generating a report.');
  }

  const responseCount = responseCountResult.count;

  const surveySettings = (surveyRow['settings'] as Record<string, unknown> | null) ?? {};
  const rawLikertSize =
    typeof surveySettings['likertSize'] === 'number'
      ? (surveySettings['likertSize'] as number)
      : 4;
  const likertSize = rawLikertSize >= 2 ? rawLikertSize : 4;
  const likertRange = likertSize - 1;

  const dimensionScores: Record<string, number> = {};
  let overallScore = 0;
  let dimensionCount = 0;
  const dimensionPercentages: Record<string, number> = {};

  for (const row of scoresResult.data ?? []) {
    const raw = row as Record<string, unknown>;
    const dim = raw['dimensions'] as Record<string, unknown>;
    const code = dim['code'] as string;
    const score = raw['raw_score'] as number;
    dimensionScores[code] = score;
    dimensionPercentages[code] = ((score - 1) / likertRange) * 100;
    overallScore += score;
    dimensionCount += 1;
  }

  if (dimensionCount > 0) {
    overallScore = overallScore / dimensionCount;
  }

  const segments: Record<string, Record<string, number>> = {};
  for (const row of segmentScoresResult.data ?? []) {
    const raw = row as Record<string, unknown>;
    const segmentType = raw['segment_type'] as string;
    const segmentValue = raw['segment_value'] as string;
    const score = raw['raw_score'] as number;
    const isMasked = raw['is_masked'] as boolean;

    if (isMasked || score == null) {
      continue;
    }

    const key = `${segmentType}:${segmentValue}`;
    if (!segments[key]) {
      segments[key] = {};
    }
    const dimensionCode = raw['dimension_code'] as string;
    segments[key][dimensionCode] = score;
  }

  const recommendations = (recommendationsResult.data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      dimension: raw['dimension_code'] as string,
      severity: raw['severity'] as string,
      title: raw['title'] as string,
      description: raw['description'] as string,
      actions: (raw['actions'] as string[]) ?? [],
    };
  });

  const archetype = (surveyRow['archetype'] as string) ?? 'Unclassified';
  const archetypeDescription = (surveyRow['archetype_description'] as string) ?? '';

  return {
    survey: {
      id: surveyRow['id'] as string,
      title: surveyRow['title'] as string,
      organizationName: orgResult.name,
      closesAt: (surveyRow['closes_at'] as string) ?? '',
      responseCount: responseCount ?? 0,
    },
    scores: {
      overall: overallScore,
      dimensions: dimensionScores,
      segments,
    },
    compass: {
      archetype,
      archetypeDescription,
      dimensionPercentages,
    },
    recommendations,
    branding: {
      orgLogoUrl: orgResult.logoUrl,
      cccLogoUrl: orgResult.cccLogoUrl,
      colors: orgResult.colors,
    },
    sections: includedSections,
  };
}

interface OrgInfo {
  name: string;
  logoUrl: string | null;
  cccLogoUrl: string | null;
  colors: Record<string, string>;
}

async function fetchOrganizationForSurvey(surveyId: string): Promise<OrgInfo> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('surveys')
    .select('organization_id, organizations(name, logo_url, settings)')
    .eq('id', surveyId)
    .single();

  if (error) throw error;

  const raw = data as Record<string, unknown>;
  const org = raw['organizations'] as Record<string, unknown> | null;

  const settings = (org?.['settings'] as Record<string, unknown>) ?? {};
  const brandColors = (settings['brand_colors'] as Record<string, string>) ?? {};

  return {
    name: (org?.['name'] as string) ?? 'Unknown Organization',
    logoUrl: (org?.['logo_url'] as string) ?? null,
    cccLogoUrl: null,
    colors: brandColors,
  };
}
