/**
 * Server-side report data assembly for the generate-report edge function.
 * Queries Supabase for survey details, scores, segments, and recommendations,
 * then maps DB rows to a ReportPayload-compatible object.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Inline Types (can't import @compass/types in Deno) ─────────────────────

export interface ReportPayload {
  survey: {
    id: string;
    title: string;
    organizationName: string;
    closesAt: string;
    responseCount: number;
  };
  scores: {
    overall: number;
    dimensions: Record<string, number>;
    segments: Record<string, Record<string, number>>;
  };
  compass: {
    archetype: string;
    archetypeDescription: string;
    dimensionPercentages: Record<string, number>;
  };
  recommendations: Array<{
    dimension: string;
    severity: string;
    title: string;
    description: string;
    actions: string[];
  }>;
  branding: {
    orgLogoUrl: string | null;
    cccLogoUrl: string | null;
    colors: Record<string, string>;
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Assemble the full report payload from survey data.
 * Uses the service_role client for unrestricted access.
 */
export async function assembleReportPayload(
  client: SupabaseClient,
  surveyId: string,
): Promise<ReportPayload> {
  const [surveyResult, scoresResult, segmentScoresResult, recommendationsResult] =
    await Promise.all([
      client
        .from('surveys')
        .select('*, organizations(name, branding, settings)')
        .eq('id', surveyId)
        .single(),
      client
        .from('scores')
        .select('*, dimensions!inner(code, name)')
        .eq('survey_id', surveyId)
        .is('segment_type', null),
      client
        .from('safe_segment_scores')
        .select('*')
        .eq('survey_id', surveyId),
      client
        .from('recommendations')
        .select('*, dimensions!inner(code)')
        .eq('survey_id', surveyId)
        .order('priority', { ascending: true }),
    ]);

  if (surveyResult.error) throw new Error(`Failed to load survey: ${surveyResult.error.message}`);
  if (scoresResult.error) throw new Error(`Failed to load scores: ${scoresResult.error.message}`);
  if (segmentScoresResult.error) throw new Error(`Failed to load segment scores: ${segmentScoresResult.error.message}`);
  if (recommendationsResult.error) throw new Error(`Failed to load recommendations: ${recommendationsResult.error.message}`);

  const surveyRow = surveyResult.data as Record<string, unknown>;

  if (!(surveyRow['scores_calculated'] as boolean)) {
    throw new Error('Survey scores have not been calculated. Run scoring before generating a report.');
  }

  // Response count
  const { count: responseCount } = await client
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);

  // Organization info
  const org = surveyRow['organizations'] as Record<string, unknown> | null;
  const orgSettings = (org?.['settings'] as Record<string, unknown>) ?? {};
  const brandColors = (orgSettings['brand_colors'] as Record<string, string>) ?? {};

  // Map dimension scores
  const dimensionScores: Record<string, number> = {};
  const dimensionPercentages: Record<string, number> = {};
  let overallScore = 0;
  let dimensionCount = 0;

  for (const row of scoresResult.data ?? []) {
    const raw = row as Record<string, unknown>;
    const dim = raw['dimensions'] as Record<string, unknown>;
    const code = dim['code'] as string;
    const score = raw['raw_score'] as number;
    dimensionScores[code] = score;
    dimensionPercentages[code] = (score / 4) * 100;
    overallScore += score;
    dimensionCount += 1;
  }

  if (dimensionCount > 0) {
    overallScore = overallScore / dimensionCount;
  }

  // Map segment scores (pre-filtered by safe_segment_scores view)
  const segments: Record<string, Record<string, number>> = {};
  for (const row of segmentScoresResult.data ?? []) {
    const raw = row as Record<string, unknown>;
    const isMasked = raw['is_masked'] as boolean;
    const score = raw['raw_score'] as number;

    if (isMasked || score == null) continue;

    const segmentType = raw['segment_type'] as string;
    const segmentValue = raw['segment_value'] as string;
    const key = `${segmentType}:${segmentValue}`;
    if (!segments[key]) segments[key] = {};

    const dimensionCode = raw['dimension_code'] as string;
    segments[key][dimensionCode] = score;
  }

  // Map recommendations
  const recommendations = (recommendationsResult.data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const dim = raw['dimensions'] as Record<string, unknown> | null;
    return {
      dimension: (dim?.['code'] as string) ?? '',
      severity: raw['severity'] as string,
      title: raw['title'] as string,
      description: (raw['body'] as string) ?? '',
      actions: (raw['actions'] as string[]) ?? [],
    };
  });

  return {
    survey: {
      id: surveyRow['id'] as string,
      title: surveyRow['title'] as string,
      organizationName: (org?.['name'] as string) ?? 'Unknown Organization',
      closesAt: (surveyRow['closes_at'] as string) ?? '',
      responseCount: responseCount ?? 0,
    },
    scores: {
      overall: overallScore,
      dimensions: dimensionScores,
      segments,
    },
    compass: {
      archetype: (surveyRow['archetype'] as string) ?? 'Unclassified',
      archetypeDescription: (surveyRow['archetype_description'] as string) ?? '',
      dimensionPercentages,
    },
    recommendations,
    branding: {
      orgLogoUrl: ((org?.['branding'] as Record<string, unknown>)?.['logo_url'] as string) ?? null,
      cccLogoUrl: null,
      colors: brandColors,
    },
  };
}
