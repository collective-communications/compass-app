import type { CoreHealthStatus } from './types.ts';

/**
 * Classify core dimension health based on its percentage score.
 *
 * - Above 70: 'healthy'
 * - 50-70 (inclusive): 'fragile'
 * - Below 50: 'broken'
 */
export function classifyCoreHealth(coreScore: number): CoreHealthStatus {
  if (coreScore > 70) return 'healthy';
  if (coreScore >= 50) return 'fragile';
  return 'broken';
}
