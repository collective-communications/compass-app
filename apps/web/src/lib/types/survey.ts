/**
 * Shared survey-related types used across features.
 */

/** Survey available in the survey picker (scores already calculated). */
export interface ScoredSurvey {
  id: string;
  title: string;
  closedAt: string | null;
  scoresCalculatedAt: string | null;
  responseCount: number;
}
