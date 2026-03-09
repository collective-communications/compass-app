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
}

/** Likert value distribution for a single question. */
export interface LikertDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
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

/** Survey available in the survey picker (scores already calculated). */
export interface ScoredSurvey {
  id: string;
  title: string;
  closedAt: string | null;
  scoresCalculatedAt: string | null;
  responseCount: number;
}

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
  | 'recommendations';

export interface ResultsTab {
  id: ResultsTabId;
  label: string;
}

export const RESULTS_TABS: ResultsTab[] = [
  { id: 'compass', label: 'Compass' },
  { id: 'survey', label: 'Survey' },
  { id: 'groups', label: 'Groups' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'recommendations', label: 'Recommendations' },
] as const;
