/**
 * TrustLadderCard — interactive Trust Ladder panel showing
 * scored rungs mapped to dimension scores.
 * Rendered in the insights panel.
 */

import type { ReactElement } from 'react';
import { useTrustLadder } from '../../hooks/use-trust-ladder';
import { TrustLadderVisual } from './trust-ladder-visual';

interface TrustLadderCardProps {
  surveyId: string;
}

/** Trust Ladder card for the insights panel, driven by live dimension scores. */
export function TrustLadderCard({ surveyId }: TrustLadderCardProps): ReactElement {
  const { data, isLoading, error } = useTrustLadder(surveyId);

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--grey-100)]" />
        <div className="mt-3 flex flex-col gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-[var(--grey-100)]" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
        <p className="text-xs text-[var(--text-tertiary)]">Unable to load Trust Ladder.</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6"
      aria-labelledby="trust-ladder-heading"
    >
      <TrustLadderVisual result={data} />
    </section>
  );
}
