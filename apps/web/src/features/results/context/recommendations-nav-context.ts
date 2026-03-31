/**
 * Context for sharing recommendation navigation state between the
 * recommendations tab, sidebar (desktop), and mobile strip.
 */

import { createContext, useContext } from 'react';
import type { Recommendation } from '../types';

export interface RecommendationsNavContextValue {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  sortedRecommendations: Recommendation[];
}

export const RecommendationsNavContext = createContext<RecommendationsNavContextValue>({
  activeIndex: 0,
  setActiveIndex: () => {},
  sortedRecommendations: [],
});

/** Hook to consume the recommendations navigation context. */
export function useRecommendationsNav(): RecommendationsNavContextValue {
  return useContext(RecommendationsNavContext);
}
