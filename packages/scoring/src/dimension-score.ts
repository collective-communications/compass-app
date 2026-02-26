import { LIKERT_MIN, LIKERT_RANGE, SCORE_DECIMALS } from './constants.js';
import { ScoringError } from './errors.js';
import { normalizeAnswer } from './normalize.js';
import type { AnswerWithMeta, DimensionCode, DimensionScore, DimensionScoreMap } from './types.js';

/** Round to N decimal places using integer math to avoid floating-point drift. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate the score for a single dimension from its answers.
 *
 * Weighted average: sum(normalizedValue * weight) / sum(weight)
 * Score formula: ((weightedAvg - 1) / 3) * 100
 *
 * @throws ScoringError on empty answers or non-positive weights.
 */
export function calculateDimensionScore(
  dimensionId: string,
  dimensionCode: DimensionCode,
  answers: readonly AnswerWithMeta[],
): DimensionScore {
  if (answers.length === 0) {
    throw new ScoringError('EMPTY_ANSWERS', `No answers provided for dimension "${dimensionCode}"`);
  }

  let weightedSum = 0;
  let weightSum = 0;

  for (const answer of answers) {
    if (answer.weight <= 0) {
      throw new ScoringError(
        'INVALID_WEIGHT',
        `Weight must be positive, got ${answer.weight} for question "${answer.questionId}"`,
      );
    }

    const normalized = normalizeAnswer(answer.value, answer.reverseScored);
    weightedSum += normalized * answer.weight;
    weightSum += answer.weight;
  }

  const rawScore = roundTo(weightedSum / weightSum, SCORE_DECIMALS);
  const score = roundTo(((rawScore - LIKERT_MIN) / LIKERT_RANGE) * 100, SCORE_DECIMALS);

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
 * @throws ScoringError if any dimension has no answers or contains invalid data.
 */
export function calculateAllDimensionScores(answers: readonly AnswerWithMeta[]): DimensionScoreMap {
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
    result[code] = calculateDimensionScore(group[0].dimensionId, code, group);
  }

  return result;
}
