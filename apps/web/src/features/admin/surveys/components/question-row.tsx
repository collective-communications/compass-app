/**
 * Single question row in the survey builder.
 * Shows display order, question text, type badge, and reverse-scored indicator.
 */

import type { ReactElement } from 'react';
import type { QuestionWithDimension, QuestionType } from '@compass/types';

interface QuestionRowProps {
  question: QuestionWithDimension;
  isLocked: boolean;
  onEdit: (questionId: string) => void;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  likert_4: 'Likert',
  open_text: 'Open Text',
};

export function QuestionRow({ question, isLocked, onEdit }: QuestionRowProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => !isLocked && onEdit(question.id)}
      disabled={isLocked}
      className={`flex w-full items-start gap-3 rounded-lg border border-[#E5E4E0] bg-white px-4 py-3 text-left transition-shadow ${
        isLocked ? 'cursor-default opacity-70' : 'cursor-pointer hover:shadow-sm'
      }`}
    >
      <span className="mt-0.5 shrink-0 text-xs font-mono text-[var(--grey-400)]">
        {question.displayOrder}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--grey-900)]">{question.text}</p>
        {question.diagnosticFocus && (
          <p className="mt-0.5 text-xs text-[var(--grey-500)]">
            Focus: {question.diagnosticFocus}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded bg-[var(--grey-100)] px-2 py-0.5 text-xs text-[var(--grey-600)]">
          {TYPE_LABEL[question.type]}
        </span>
        {question.reverseScored && (
          <span
            className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700"
            title="Reverse scored"
          >
            R
          </span>
        )}
      </div>
    </button>
  );
}
