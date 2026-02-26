import { classifyCoreHealth } from './core-health.js';
import { calculateAllDimensionScores } from './dimension-score.js';
import type { AnswerWithMeta, SurveyScoreResult } from './types.js';

/**
 * Full scoring pipeline: normalize, group, score, classify.
 *
 * Pure function — no side effects, no I/O.
 */
export function computeSurveyScores(
  surveyId: string,
  answers: readonly AnswerWithMeta[],
): SurveyScoreResult {
  const overallScores = calculateAllDimensionScores(answers);
  const coreHealth = classifyCoreHealth(overallScores.core.score);

  return {
    surveyId,
    overallScores,
    coreHealth,
    calculatedAt: new Date().toISOString(),
  };
}
