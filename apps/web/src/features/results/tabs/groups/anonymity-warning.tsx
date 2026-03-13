/**
 * Warning card shown when a segment falls below the anonymity threshold.
 * The safe_segment_scores view returns score: null for these segments;
 * this component communicates that state to the person.
 */

import type { ReactElement } from 'react';
import { Lock } from 'lucide-react';

interface AnonymityWarningProps {
  segmentValue: string;
}

export function AnonymityWarning({ segmentValue }: AnonymityWarningProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-[var(--grey-100)] bg-amber-50 p-6"
    >
      <Lock className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-[var(--grey-700)]">
          Not enough responses to display this segment.
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Results for &ldquo;{segmentValue}&rdquo; are hidden to protect respondent anonymity.
        </p>
      </div>
    </div>
  );
}
