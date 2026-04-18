/**
 * Shared result types for the results feature.
 * These represent rows from Supabase views and derived client-side computations.
 */

import type { DimensionCode } from '@compass/types';
import type {
  DimensionScoreMap,
  ArchetypeMatch,
  RiskFlag,
} from '@compass/scoring';

// ─── Database Row Types ─────────────────────────────────────────────────────

/** Row from the safe_segment_scores view (anonymity-enforced). */
export interface DimensionScoreRow {
  surveyId: string;
  segmentType: string;
  segmentValue: string;
  dimensionCode: DimensionCode;
  isMasked: boolean;
  score: number | null;
  rawScore: number | null;
  responseCount: number | null;
}

/** Row shape returned by the question_scores RPC or view. */
export interface QuestionScoreRow {
  questionId: string;
  questionText: string;
  dimensionCode: DimensionCode;
  meanScore: number;
  distribution: LikertDistribution;
  responseCount: number;
  isReverseScored: boolean;
  /** Sub-dimension code, if the question belongs to one. */
  subDimensionCode: string | null;
  /** Sub-dimension display name, if the question belongs to one. */
  subDimensionName: string | null;
}

/**
 * Likert value distribution for a single question.
 * Keys are 1-based Likert values; values are response counts.
 * Dynamic — supports any scale size (4-point, 5-point, etc.).
 */
export type LikertDistribution = Record<number, number>;

/**
 * Create an empty distribution with all keys initialized to 0.
 *
 * @param scaleSize - Number of points on the Likert scale.
 * @returns A distribution record with keys 1 through scaleSize, all set to 0.
 */
export function createEmptyDistribution(scaleSize: number): LikertDistribution {
  const dist: LikertDistribution = {};
  for (let i = 1; i <= scaleSize; i++) {
    dist[i] = 0;
  }
  return dist;
}

/** Open-ended dialogue response. */
export interface DialogueResponse {
  id: string;
  questionId: string;
  questionText: string;
  responseText: string;
  createdAt: string;
}

/** Recommendation generated from scoring analysis. */
export interface Recommendation {
  id: string;
  dimensionCode: DimensionCode;
  severity: RiskFlag['severity'];
  title: string;
  body: string;
  actions: string[];
  cccServiceLink: string | null;
  trustLadderLink: string | null;
  priority: number;
}

/** Survey available in the survey picker (scores already calculated). Canonical definition in lib/types/survey.ts. */
export type { ScoredSurvey } from '../../lib/types/survey';

// ─── Derived Types ──────────────────────────────────────────────────────────

/** Overall dimension scores transformed from rows into a map. */
export type OverallScores = DimensionScoreMap;

/** Re-export for convenience. */
export type { ArchetypeMatch, RiskFlag, DimensionScoreMap };

// ─── Tab Configuration ──────────────────────────────────────────────────────

/** Results section tab identifiers, matching route segments. */
export type ResultsTabId =
  | 'compass'
  | 'survey'
  | 'groups'
  | 'dialogue'
  | 'reports'
  | 'recommendations';

export interface ResultsTab {
  id: ResultsTabId;
  label: string;
}

/** URL search params for the `/results/$surveyId/groups` route. */
export interface GroupsSearch {
  segmentType?: string;
  segmentValue?: string;
}

export const RESULTS_TABS: ResultsTab[] = [
  { id: 'compass', label: 'Compass' },
  { id: 'survey', label: 'Survey' },
  { id: 'groups', label: 'Groups' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'reports', label: 'Reports' },
  { id: 'recommendations', label: 'Recommendations' },
] as const;
