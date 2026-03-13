/**
 * Single question row in the survey builder.
 * Shows drag handle, question code, question text, type badge, and reverse-scored indicator.
 * Uses @dnd-kit/sortable for drag-and-drop reordering.
 */

import { type ReactElement } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import type { QuestionWithDimension, QuestionType } from '@compass/types';

interface QuestionRowProps {
  question: QuestionWithDimension;
  isLocked: boolean;
  onEdit: (questionId: string) => void;
  /** Question code label (e.g., "C1", "L2") based on dimension abbreviation + order within dimension */
  questionCode: string;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  likert_4: 'Likert',
  open_text: 'Open Text',
};

export function QuestionRow({ question, isLocked, onEdit, questionCode }: QuestionRowProps): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
    disabled: isLocked,
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full items-start gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-3 text-left transition-shadow ${
        isDragging ? 'z-50 shadow-lg opacity-90' : ''
      } ${isLocked ? 'opacity-70' : ''}`}
    >
      {/* Drag handle */}
      {!isLocked && (
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      )}

      {/* Question code */}
      <span className="mt-0.5 shrink-0 rounded bg-[var(--grey-100)] px-1.5 py-0.5 text-xs font-mono font-medium text-[var(--text-tertiary)]">
        {questionCode}
      </span>

      {/* Question text (clickable for edit) */}
      <button
        type="button"
        onClick={() => !isLocked && onEdit(question.id)}
        disabled={isLocked}
        className={`min-w-0 flex-1 text-left ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <p className="text-sm text-[var(--grey-900)]">{question.text}</p>
        {question.diagnosticFocus && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Focus: {question.diagnosticFocus}
          </p>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded bg-[var(--grey-100)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
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
    </div>
  );
}
