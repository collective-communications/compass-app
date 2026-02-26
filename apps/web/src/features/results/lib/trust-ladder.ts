/**
 * Static Trust Ladder data — maps the 9 rungs of the
 * CC+C Trust Ladder to their parent culture dimensions.
 */

import type { DimensionCode } from '@compass/types';

/** A single rung on the Trust Ladder. */
export interface TrustLadderRung {
  rung: number;
  label: string;
  dimensionCode: DimensionCode;
  dimensionLabel: string;
}

/** The complete Trust Ladder, ordered from rung 1 (foundation) upward. */
export const TRUST_LADDER: readonly TrustLadderRung[] = [
  { rung: 1, label: 'Purpose', dimensionCode: 'core', dimensionLabel: 'Core' },
  { rung: 2, label: 'Values', dimensionCode: 'core', dimensionLabel: 'Core' },
  { rung: 3, label: 'Mission / Vision', dimensionCode: 'clarity', dimensionLabel: 'Clarity' },
  { rung: 4, label: 'Strategic Priorities', dimensionCode: 'clarity', dimensionLabel: 'Clarity' },
  { rung: 5, label: 'Role Clarification', dimensionCode: 'clarity', dimensionLabel: 'Clarity' },
  { rung: 6, label: 'Relationship', dimensionCode: 'connection', dimensionLabel: 'Connection' },
  { rung: 7, label: 'Team Members', dimensionCode: 'connection', dimensionLabel: 'Connection' },
  { rung: 8, label: 'Processes & Platforms', dimensionCode: 'collaboration', dimensionLabel: 'Collaboration' },
  { rung: 9, label: 'Career / Growth', dimensionCode: 'collaboration', dimensionLabel: 'Collaboration' },
] as const;
