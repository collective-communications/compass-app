/**
 * TrustLadderCard — static reference panel showing how
 * Trust Ladder rungs map to culture dimensions.
 * Rendered in the insights panel.
 */

import type { ReactElement } from 'react';
import { TRUST_LADDER } from '../../lib/trust-ladder';

/** Trust Ladder reference card for the insights panel. */
export function TrustLadderCard(): ReactElement {
  return (
    <section
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6"
      aria-labelledby="trust-ladder-heading"
    >
      <h3 id="trust-ladder-heading" className="mb-4 text-sm font-semibold text-[var(--grey-900)]">
        Trust Ladder
      </h3>
      <dl className="flex flex-col gap-2">
        {TRUST_LADDER.map((rung) => (
          <div key={rung.rung} className="flex items-baseline gap-2">
            <dt className="shrink-0 text-xs font-medium text-[var(--grey-400)]">
              {rung.rung}.
            </dt>
            <dd className="flex items-baseline gap-1.5 text-sm text-[var(--grey-700)]">
              <span>{rung.label}</span>
              <span className="text-xs text-[var(--grey-400)]">{rung.dimensionLabel}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
