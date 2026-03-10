/**
 * Expandable archetype identification card.
 * Shows archetype name + subtitle; tap/click toggles full description.
 */

import { useState, type ReactElement } from 'react';
import type { ArchetypeMatch } from '@compass/scoring';
import { Card } from '@/components/ui/card';

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
    <Card className="rounded-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--grey-400)]">
        Culture Archetype
      </p>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="archetype-description"
      >
        <h3 className="text-lg font-bold text-[var(--grey-900)]">{match.archetype.name}</h3>
        <p className="mt-0.5 text-sm text-[var(--grey-500)]">{CONFIDENCE_LABEL[match.confidence]}</p>
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
    </Card>
  );
}
