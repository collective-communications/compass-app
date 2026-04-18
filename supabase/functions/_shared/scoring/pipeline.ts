import { classifyCoreHealth } from './core-health.ts';
import { calculateAllDimensionScores } from './dimension-score.ts';
import { calculateSubDimensionScores } from './sub-dimension-score.ts';
import type { AnswerWithMeta, SurveyScoreResult } from './types.ts';

/**
 * Full scoring pipeline: normalize, group, score, classify.
 *
 * Pure function — no side effects, no I/O.
 *
 * @param surveyId - UUID of the survey being scored.
 * @param answers - Full answer set with scoring metadata.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 */
export function computeSurveyScores(
  surveyId: string,
  answers: readonly AnswerWithMeta[],
  scaleSize: number = 4,
): SurveyScoreResult {
  const overallScores = calculateAllDimensionScores(answers, scaleSize);
  const coreHealth = classifyCoreHealth(overallScores.core.score);
  const subDimensionScores = calculateSubDimensionScores(answers, scaleSize);

  return {
    surveyId,
    overallScores,
    coreHealth,
    subDimensionScores,
    calculatedAt: new Date().toISOString(),
  };
}
