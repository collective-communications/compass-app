/** Trust Ladder types for the scoring package. */

import type { DimensionCode } from './types.js';

/** Status of a single trust ladder rung based on its dimension score. */
export type TrustRungStatus = 'achieved' | 'in_progress' | 'not_started';

/** Scored result for a single rung on the Trust Ladder. */
export interface TrustRungScore {
  rung: number;
  name: string;
  dimensionCode: DimensionCode;
  score: number;
  maxScore: 4;
  status: TrustRungStatus;
}

/** Full Trust Ladder computation result. */
export interface TrustLadderResult {
  rungs: TrustRungScore[];
  /** Highest rung number with 'achieved' status, 0 if none. */
  currentLevel: number;
  /** Labels of the first 1–2 actionable rungs above currentLevel. */
  nextActions: string[];
}
