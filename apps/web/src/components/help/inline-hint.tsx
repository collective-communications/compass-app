import type { ReactElement } from 'react';

interface InlineHintProps {
  text: string;
  /** When provided, the parent form element should use aria-describedby={id} */
  id?: string;
}

/**
 * Persistent microcopy rendered below form elements.
 * Always visible — no interaction, no toggle.
 */
export function InlineHint({ text, id }: InlineHintProps): ReactElement {
  return (
    <p id={id} className="text-sm text-[var(--text-secondary)]">
      {text}
    </p>
  );
}
