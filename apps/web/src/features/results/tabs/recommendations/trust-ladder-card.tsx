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
      className="rounded-lg border border-[#E5E4E0] bg-white p-6"
      aria-labelledby="trust-ladder-heading"
    >
      <h3 id="trust-ladder-heading" className="mb-4 text-sm font-semibold text-[#212121]">
        Trust Ladder
      </h3>
      <dl className="flex flex-col gap-2">
        {TRUST_LADDER.map((rung) => (
          <div key={rung.rung} className="flex items-baseline gap-2">
            <dt className="shrink-0 text-xs font-medium text-[#9E9E9E]">
              {rung.rung}.
            </dt>
            <dd className="flex items-baseline gap-1.5 text-sm text-[#424242]">
              <span>{rung.label}</span>
              <span className="text-xs text-[#9E9E9E]">{rung.dimensionLabel}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
