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
    <article className="rounded-[10px] border border-[#E5E4E0] bg-white px-6 py-5">
      <p className="mb-2 text-xs font-medium text-[#757575]">{response.questionText}</p>
      <p className="text-sm leading-relaxed text-[#212121]">{response.responseText}</p>
    </article>
  );
}
