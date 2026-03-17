import { SCORE_DECIMALS } from './constants.js';
import { normalizeAnswer } from './normalize.js';
import type { AnswerWithMeta, DimensionCode, SubDimensionScore } from './types.js';

/** Round to N decimal places using integer math to avoid floating-point drift. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate scores for all sub-dimensions present in the answer set.
 *
 * Groups answers by `subDimensionCode`, computes a weighted average for each
 * group, and converts to a 0-100 percentage. Answers without a
 * `subDimensionCode` are silently skipped.
 *
 * @param answers - Full answer set with scoring metadata.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 * @returns Sub-dimension scores sorted by dimensionCode then subDimensionCode.
 */
export function calculateSubDimensionScores(
  answers: readonly AnswerWithMeta[],
  scaleSize: number = 4,
): SubDimensionScore[] {
  const groups = new Map<
    string,
    { dimensionCode: DimensionCode; answers: AnswerWithMeta[] }
  >();

  for (const answer of answers) {
    if (!answer.subDimensionCode) continue;

    let group = groups.get(answer.subDimensionCode);
    if (!group) {
      group = { dimensionCode: answer.dimensionCode, answers: [] };
      groups.set(answer.subDimensionCode, group);
    }
    group.answers.push(answer);
  }

  const range = scaleSize - 1;
  const results: SubDimensionScore[] = [];

  for (const [code, group] of groups) {
    let weightedSum = 0;
    let weightSum = 0;

    for (const answer of group.answers) {
      const normalized = normalizeAnswer(answer.value, answer.reverseScored, scaleSize);
      weightedSum += normalized * answer.weight;
      weightSum += answer.weight;
    }

    const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
    const score = roundTo(((rawScore - 1) / range) * 100, SCORE_DECIMALS);

    results.push({
      subDimensionCode: code,
      dimensionCode: group.dimensionCode,
      score,
      rawScore,
      responseCount: group.answers.length,
    });
  }

  // Sort by dimensionCode then subDimensionCode for stable output
  results.sort((a, b) => {
    const dimCmp = a.dimensionCode.localeCompare(b.dimensionCode);
    if (dimCmp !== 0) return dimCmp;
    return a.subDimensionCode.localeCompare(b.subDimensionCode);
  });

  return results;
}
