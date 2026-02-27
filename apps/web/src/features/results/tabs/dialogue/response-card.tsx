/**
 * Response card — displays a single anonymized open-ended response.
 * White card with border, question label above the response text.
 */

import type { ReactElement } from 'react';
import type { DialogueResponse } from '../../types';

interface ResponseCardProps {
  response: DialogueResponse;
}

/** Individual anonymized dialogue response card. */
export function ResponseCard({ response }: ResponseCardProps): ReactElement {
  return (
    <article className="rounded-[10px] border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-5">
      <p className="mb-2 text-xs font-medium text-[var(--grey-500)]">{response.questionText}</p>
      <p className="text-sm leading-relaxed text-[var(--grey-900)]">{response.responseText}</p>
    </article>
  );
}
