/**
 * Pure scoring math for the score-survey edge function.
 * Replicated from @compass/scoring to avoid Deno workspace import issues.
 * These are stateless, side-effect-free functions.
 */

import {
  SCORE_DECIMALS,
  DIMENSION_CODES,
  type DimensionCode,
  type AnswerWithMeta,
  type DimensionScore,
  type DimensionScoreMap,
  type SubDimensionScore,
} from './types.ts';

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Normalize a Likert answer, applying reverse scoring when needed. */
export function normalizeAnswer(value: number, reverseScored: boolean, scaleSize: number): number {
  return reverseScored ? scaleSize + 1 - value : value;
}

/** Calculate dimension score from a set of weighted, normalized answers. */
export function calculateDimensionScore(
  dimensionId: string,
  dimensionCode: DimensionCode,
  answers: readonly AnswerWithMeta[],
  scaleSize: number,
): DimensionScore {
  const range = scaleSize - 1;
  let weightedSum = 0;
  let weightSum = 0;

  for (const answer of answers) {
    const normalized = normalizeAnswer(answer.value, answer.reverseScored, scaleSize);
    weightedSum += normalized * answer.weight;
    weightSum += answer.weight;
  }

  const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
  const score = roundTo(((rawScore - 1) / range) * 100, SCORE_DECIMALS);

  return { dimensionId, dimensionCode, score, rawScore, responseCount: answers.length };
}

/** Calculate scores for all four dimensions from grouped answers. */
export function calculateAllDimensionScores(
  groups: Map<DimensionCode, AnswerWithMeta[]>,
  scaleSize: number,
): DimensionScoreMap {
  const result = {} as DimensionScoreMap;

  for (const code of DIMENSION_CODES) {
    const answers = groups.get(code);
    if (!answers || answers.length === 0) {
      throw new Error(`No answers found for dimension "${code}"`);
    }
    result[code] = calculateDimensionScore(answers[0].dimensionId, code, answers, scaleSize);
  }

  return result;
}

/** Calculate sub-dimension scores from all answers. */
export function calculateSubDimensionScores(
  answers: AnswerWithMeta[],
  scaleSize: number,
): SubDimensionScore[] {
  const groups = new Map<string, { dimensionCode: DimensionCode; answers: AnswerWithMeta[] }>();

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

  return results;
}

/** Euclidean distance between observed dimension scores and an archetype target. */
export function euclideanDistance(
  scores: Record<string, number>,
  target: Record<string, number>,
): number {
  let sumSquared = 0;
  for (const key of Object.keys(target)) {
    const a = scores[key] ?? 0;
    const b = target[key];
    sumSquared += (a - b) ** 2;
  }
  return Math.sqrt(sumSquared);
}

/** Classify core dimension health. */
export function classifyCoreHealth(coreScore: number): 'healthy' | 'fragile' | 'broken' {
  if (coreScore > 70) return 'healthy';
  if (coreScore >= 50) return 'fragile';
  return 'broken';
}
