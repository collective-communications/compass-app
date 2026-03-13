/**
 * Admin survey builder page.
 * Two-column layout (desktop): dimension sidebar + question list.
 * Single-column (mobile): dimension pills + question list.
 * Supports editing questions via dialog with auto-save.
 * Surveys with responses are fully locked.
 * Questions are grouped by dimension with collapsible sections.
 * Drag-and-drop reordering via @dnd-kit.
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { QuestionWithDimension, Dimension, DimensionCode } from '@compass/types';
import { useSurveyBuilder } from '../hooks/use-survey-builder';
import { useReorderQuestions } from '../hooks/use-reorder-questions';
import { DimensionNav } from './dimension-nav';
import { QuestionRow } from './question-row';
import { EditQuestionDialog } from './edit-question-dialog';
import { AutoSaveIndicator, type AutoSaveStatus } from './auto-save-indicator';
import { DrilldownHeader } from '../../../../components/navigation/drilldown-header';

interface SurveyBuilderPageProps {
  surveyId: string;
  onBack: () => void;
}

/** Dimension code abbreviation map for question codes (e.g., C1, L2, N3, B4) */
const DIMENSION_ABBREVIATION: Record<DimensionCode, string> = {
  core: 'C',
  clarity: 'L',
  connection: 'N',
  collaboration: 'B',
};

/**
 * Build question code labels (e.g., "C1", "L2") based on dimension abbreviation
 * and the question's order within its dimension group.
 */
function buildQuestionCodes(
  questions: QuestionWithDimension[],
  dimensions: Dimension[],
): Map<string, string> {
  const codes = new Map<string, string>();
  const dimCounters = new Map<string, number>();

  // Sort questions by displayOrder to assign sequential codes
  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const q of sorted) {
    const dim = dimensions.find((d) => d.id === q.dimension.dimensionId);
    const abbr = dim ? (DIMENSION_ABBREVIATION[dim.code] ?? dim.code[0]?.toUpperCase() ?? '?') : '?';
    const count = (dimCounters.get(q.dimension.dimensionId) ?? 0) + 1;
    dimCounters.set(q.dimension.dimensionId, count);
    codes.set(q.id, `${abbr}${count}`);
  }

  return codes;
}

/**
 * Group questions by dimension for collapsible sections.
 */
function groupByDimension(
  questions: QuestionWithDimension[],
  dimensions: Dimension[],
): { dimension: Dimension; questions: QuestionWithDimension[] }[] {
  const groups: { dimension: Dimension; questions: QuestionWithDimension[] }[] = [];
  const dimMap = new Map(dimensions.map((d) => [d.id, d]));

  // Build groups in dimension display order
  for (const dim of dimensions) {
    const dimQuestions = questions
      .filter((q) => q.dimension.dimensionId === dim.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (dimQuestions.length > 0) {
      groups.push({ dimension: dim, questions: dimQuestions });
    }
  }

  // Add any questions whose dimension is missing (defensive)
  const assignedIds = new Set(groups.flatMap((g) => g.questions.map((q) => q.id)));
  const unassigned = questions.filter((q) => !assignedIds.has(q.id));
  if (unassigned.length > 0) {
    const unknownDim: Dimension = {
      id: '__unknown__',
      code: 'core' as DimensionCode,
      name: 'Other',
      description: null,
      color: '#9E9E9E',
      displayOrder: 999,
      segmentStartAngle: null,
      segmentEndAngle: null,
      createdAt: '',
    };
    groups.push({ dimension: unknownDim, questions: unassigned });
  }

  return groups;
}

export function SurveyBuilderPage({ surveyId, onBack }: SurveyBuilderPageProps): ReactElement {
  const { data, isLoading, error } = useSurveyBuilder({ surveyId });
  const reorderMutation = useReorderQuestions();
  const [activeDimensionId, setActiveDimensionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [collapsedDimensions, setCollapsedDimensions] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filteredQuestions = useMemo((): QuestionWithDimension[] => {
    if (!data?.questions) return [];
    if (activeDimensionId === null) return data.questions;
    return data.questions.filter((q) => q.dimension.dimensionId === activeDimensionId);
  }, [data?.questions, activeDimensionId]);

  const questionCounts = useMemo((): Record<string, number> => {
    if (!data?.questions) return {};
    const counts: Record<string, number> = {};
    for (const q of data.questions) {
      const dimId = q.dimension.dimensionId;
      counts[dimId] = (counts[dimId] ?? 0) + 1;
    }
    return counts;
  }, [data?.questions]);

  const questionCodes = useMemo((): Map<string, string> => {
    if (!data?.questions || !data?.dimensions) return new Map();
    return buildQuestionCodes(data.questions, data.dimensions);
  }, [data?.questions, data?.dimensions]);

  const dimensionGroups = useMemo(() => {
    if (!data?.dimensions) return [];
    return groupByDimension(filteredQuestions, data.dimensions);
  }, [filteredQuestions, data?.dimensions]);

  const editingQuestion = useMemo((): QuestionWithDimension | null => {
    if (!editingQuestionId || !data?.questions) return null;
    return data.questions.find((q) => q.id === editingQuestionId) ?? null;
  }, [editingQuestionId, data?.questions]);

  const handleCloseDialog = useCallback((): void => {
    setEditingQuestionId(null);
  }, []);

  const toggleDimension = useCallback((dimensionId: string): void => {
    setCollapsedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dimensionId)) {
        next.delete(dimensionId);
      } else {
        next.add(dimensionId);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;
      if (!over || active.id === over.id || !data?.questions) return;

      const questions = [...filteredQuestions].sort((a, b) => a.displayOrder - b.displayOrder);
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Build new order assignments
      const reordered = [...questions];
      const [moved] = reordered.splice(oldIndex, 1) as [QuestionWithDimension];
      reordered.splice(newIndex, 0, moved);

      const reorders = reordered.map((q, idx) => ({
        questionId: q.id,
        newOrder: idx + 1,
      }));

      reorderMutation.mutate({ surveyId, reorders });
    },
    [data?.questions, filteredQuestions, reorderMutation, surveyId],
  );

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
        Loading survey builder...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load survey. Please try again.
        </div>
      </div>
    );
  }

  const { survey, dimensions, hasResponses } = data;
  const allQuestionIds = filteredQuestions.map((q) => q.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
      {/* Header */}
      <DrilldownHeader backTo="/admin/surveys" backLabel="Back to surveys" title={survey.title}>
        <AutoSaveIndicator status={autoSaveStatus} />
      </DrilldownHeader>

      {/* Template banner */}
      <div
        className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-4 text-sm text-[var(--grey-700)]"
        role="status"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" />
        <p>
          This survey uses the <span className="font-medium">CC+C Culture Assessment</span> template.
          Questions are organized by dimension. Drag to reorder within the survey.
        </p>
      </div>

      {/* Locked banner */}
      {hasResponses && (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          role="status"
        >
          This survey has responses and cannot be edited. Changes to questions could invalidate existing data.
        </div>
      )}

      {/* Dimension nav (mobile pills) */}
      <div className="mb-4 md:hidden">
        <DimensionNav
          dimensions={dimensions}
          activeDimensionId={activeDimensionId}
          onSelect={setActiveDimensionId}
          questionCounts={questionCounts}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Dimension sidebar (desktop) */}
        <div className="hidden md:block">
          <DimensionNav
            dimensions={dimensions}
            activeDimensionId={activeDimensionId}
            onSelect={setActiveDimensionId}
            questionCounts={questionCounts}
          />
        </div>

        {/* Question list with drag-and-drop */}
        <div className="min-w-0 flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
              No questions in this dimension.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={allQuestionIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-4">
                  {dimensionGroups.map((group) => {
                    const isCollapsed = collapsedDimensions.has(group.dimension.id);
                    return (
                      <div key={group.dimension.id}>
                        {/* Dimension section header */}
                        <button
                          type="button"
                          onClick={() => toggleDimension(group.dimension.id)}
                          className="mb-2 flex w-full items-center gap-2 text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight size={16} className="text-[var(--text-secondary)]" />
                          ) : (
                            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                          )}
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: group.dimension.color }}
                          />
                          <span className="text-sm font-medium text-[var(--grey-800)]">
                            {group.dimension.name}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            ({group.questions.length})
                          </span>
                        </button>

                        {/* Question rows */}
                        {!isCollapsed && (
                          <div className="flex flex-col gap-2 pl-6">
                            {group.questions.map((question) => (
                              <QuestionRow
                                key={question.id}
                                question={question}
                                isLocked={hasResponses}
                                onEdit={setEditingQuestionId}
                                questionCode={questionCodes.get(question.id) ?? '?'}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Sticky footer with Done button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--grey-100)] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {data.questions.length} question{data.questions.length !== 1 ? 's' : ''} across{' '}
            {dimensions.length} dimension{dimensions.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg bg-[var(--grey-900)] px-6 py-2 text-sm font-medium text-[var(--grey-50)] transition-colors hover:bg-[var(--grey-800)]"
          >
            Done
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      {editingQuestion && (
        <EditQuestionDialog
          question={editingQuestion}
          surveyId={surveyId}
          isOpen={editingQuestionId !== null}
          onClose={handleCloseDialog}
          onAutoSaveStatusChange={setAutoSaveStatus}
        />
      )}
    </div>
  );
}
