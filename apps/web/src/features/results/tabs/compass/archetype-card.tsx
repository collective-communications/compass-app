/**
 * Expandable archetype identification card.
 * Shows archetype name + subtitle; tap/click toggles full description.
 */

import { useState, type ReactElement } from 'react';
import type { ArchetypeMatch } from '@compass/scoring';

interface ArchetypeCardProps {
  match: ArchetypeMatch;
}

const CONFIDENCE_LABEL: Record<ArchetypeMatch['confidence'], string> = {
  strong: 'Strong match',
  moderate: 'Moderate match',
  weak: 'Weak match',
};

export function ArchetypeCard({ match }: ArchetypeCardProps): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#9E9E9E]">
        Culture Archetype
      </p>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="archetype-description"
      >
        <h3 className="text-lg font-bold text-[#212121]">{match.archetype.name}</h3>
        <p className="mt-0.5 text-sm text-[#757575]">{CONFIDENCE_LABEL[match.confidence]}</p>
        <span className="mt-2 inline-block text-xs font-medium text-[#0A3B4F] underline">
          {expanded ? 'Show less' : 'Learn more'}
        </span>
      </button>

      {expanded && (
        <p
          id="archetype-description"
          className="mt-3 text-sm leading-relaxed text-[#616161]"
        >
          {match.archetype.description}
        </p>
      )}
    </div>
  );
}
