/**
 * Response card — displays a single anonymized open-ended response.
 * White card with border, question label above the response text.
 */

import type { ReactElement } from 'react';
import type { DialogueResponse } from '../../types';
import { Card } from '../../../../components/ui/card';

interface ResponseCardProps {
  response: DialogueResponse;
  /** Reserved for future sentiment analysis integration. */
  sentiment?: 'positive' | 'neutral' | 'negative';
}

/** Individual anonymized dialogue response card. */
export function ResponseCard({ response }: ResponseCardProps): ReactElement {
  return (
    <Card className="rounded-[10px] px-6 py-5" role="article">
      <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">{response.questionText}</p>
      <p className="text-sm leading-relaxed text-[var(--grey-900)]">{response.responseText}</p>
    </Card>
  );
}
