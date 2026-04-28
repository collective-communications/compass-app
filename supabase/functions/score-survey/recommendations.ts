import type { RecommendationTemplateRow, RecommendationInsert } from './db.ts';

const DIMENSION_CODES = ['core', 'clarity', 'connection', 'collaboration'] as const;
type DimensionCode = typeof DIMENSION_CODES[number];

/**
 * Determine severity for a dimension based on its overall score.
 *
 * Thresholds mirror the risk-flag logic in the scoring pipeline so that
 * recommendation severity is always consistent with displayed risk flags.
 */
export function dimensionSeverity(dimensionCode: string, score: number): string {
  if (dimensionCode === 'core') {
    if (score < 50) return 'critical';
    if (score < 70) return 'medium';
    return 'healthy';
  }

  // clarity, connection, collaboration
  if (score < 40) return 'high';
  return 'healthy';
}

/**
 * Build the list of recommendation inserts to write for a survey.
 *
 * @param surveyId - UUID of the survey being scored.
 * @param overallScores - Map of dimension code → overall segment score.
 * @param templates - Active templates loaded from recommendation_templates.
 * @param dimensionIdMap - Map of dimension code → dimension UUID.
 */
export function matchRecommendations(
  surveyId: string,
  overallScores: Record<string, number>,
  templates: RecommendationTemplateRow[],
  dimensionIdMap: Record<string, string>,
): RecommendationInsert[] {
  const results: RecommendationInsert[] = [];

  for (const dim of DIMENSION_CODES as readonly DimensionCode[]) {
    const score = overallScores[dim];
    const dimensionId = dimensionIdMap[dim];

    // Skip dimensions not present in this survey's dimension map
    if (score === undefined || dimensionId === undefined) continue;

    const severity = dimensionSeverity(dim, score);
    const matched = templates.filter(
      (t) => t.dimension_code === dim && t.severity === severity,
    );

    for (const template of matched) {
      results.push({
        survey_id: surveyId,
        dimension_id: dimensionId,
        severity: template.severity,
        priority: template.priority,
        title: template.title,
        body: template.body,
        actions: template.actions,
        trust_ladder_link: template.trust_ladder_link,
        ccc_service_link: template.ccc_service_link,
      });
    }
  }

  return results;
}
