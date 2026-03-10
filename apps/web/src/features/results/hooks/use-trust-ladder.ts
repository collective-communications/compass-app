/**
 * TanStack Query hook for computing Trust Ladder position.
 * Fetches overall dimension scores and maps them to trust ladder rungs.
 */

import { useMemo } from 'react';
import type { TrustLadderResult } from '@compass/types';
import { calculateTrustLadderPosition } from '@compass/scoring';
import { useOverallScores } from './use-overall-scores';

interface UseTrustLadderReturn {
  data: TrustLadderResult | undefined;
  isLoading: boolean;
  error: Error | null;
}

/** Compute Trust Ladder position from a survey's overall dimension scores. */
export function useTrustLadder(surveyId: string): UseTrustLadderReturn {
  const { data: scores, isLoading, error } = useOverallScores(surveyId);

  const data = useMemo(() => {
    if (!scores) return undefined;
    return calculateTrustLadderPosition(scores);
  }, [scores]);

  return { data, isLoading, error };
}
