import { SCORE_DECIMALS } from './constants.ts';
import { ScoringError } from './errors.ts';
import { normalizeAnswer } from './normalize.ts';
import type { AnswerWithMeta, DimensionCode, DimensionScore, DimensionScoreMap } from './types.ts';

/** Round to N decimal places using integer math to avoid floating-point drift. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate the score for a single dimension from its answers.
 *
 * Weighted average: `sum(normalizedValue * weight) / sum(weight)`
 * Score formula: `((weightedAvg - 1) / (scaleSize - 1)) * 100`
 *
 * @param dimensionId - UUID of the dimension.
 * @param dimensionCode - Dimension code identifier.
 * @param answers - Answer set for this dimension.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 * @throws ScoringError on empty answers or non-positive weights.
 */
export function calculateDimensionScore(
  dimensionId: string,
  dimensionCode: DimensionCode,
  answers: readonly AnswerWithMeta[],
  scaleSize: number = 4,
): DimensionScore {
  if (answers.length === 0) {
    throw new ScoringError('EMPTY_ANSWERS', `No answers provided for dimension "${dimensionCode}"`);
  }

  const range = scaleSize - 1;
  let weightedSum = 0;
  let weightSum = 0;

  for (const answer of answers) {
    if (answer.weight <= 0) {
      throw new ScoringError(
        'INVALID_WEIGHT',
        `Weight must be positive, got ${answer.weight} for question "${answer.questionId}"`,
      );
    }

    const normalized = normalizeAnswer(answer.value, answer.reverseScored, scaleSize);
    weightedSum += normalized * answer.weight;
    weightSum += answer.weight;
  }

  const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
  const score = roundTo(((rawScore - 1) / range) * 100, SCORE_DECIMALS);

  return {
    dimensionId,
    dimensionCode,
    score,
    rawScore,
    responseCount: answers.length,
  };
}

/**
 * Calculate scores for all four dimensions by grouping answers by dimensionCode.
 *
 * @param answers - Full answer set containing answers for all dimensions.
 * @param scaleSize - Number of points on the Likert scale (default 4 for backward compat).
 * @throws ScoringError if any dimension has no answers or contains invalid data.
 */
export function calculateAllDimensionScores(
  answers: readonly AnswerWithMeta[],
  scaleSize: number = 4,
): DimensionScoreMap {
  const groups: Record<string, AnswerWithMeta[]> = {};

  for (const answer of answers) {
    const code = answer.dimensionCode;
    if (!groups[code]) {
      groups[code] = [];
    }
    groups[code].push(answer);
  }

  const dimensions: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];
  const result = {} as DimensionScoreMap;

  for (const code of dimensions) {
    const group = groups[code];
    if (!group || group.length === 0) {
      throw new ScoringError('MISSING_DIMENSION', `No answers found for dimension "${code}"`);
    }
    // Use the dimensionId from the first answer in the group
    result[code] = calculateDimensionScore(group[0]!.dimensionId, code, group, scaleSize);
  }

  return result;
}
