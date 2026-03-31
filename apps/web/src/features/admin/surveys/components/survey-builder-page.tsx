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
import type { QuestionWithDimension, Dimension, DimensionCode, SubDimension } from '@compass/types';
import { useSurveyBuilder } from '../hooks/use-survey-builder';
import { useReorderQuestions } from '../hooks/use-reorder-questions';
import { DimensionNav } from './dimension-nav';
import { QuestionRow } from './question-row';
import { EditQuestionDialog } from './edit-question-dialog';
import { AutoSaveIndicator, type AutoSaveStatus } from './auto-save-indicator';
import { DrilldownHeader } from '../../../../components/navigation/drilldown-header';

interface SurveyBuilderPageProps {
  surveyId: string;
  onBack: (organizationId: string) => void;
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

  // Pre-build a lookup map to avoid O(n*m) from dimensions.find() inside the loop
  const dimensionById = new Map<string, Dimension>();
  for (const d of dimensions) {
    dimensionById.set(d.id, d);
  }

  // Sort questions by displayOrder to assign sequential codes
  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const q of sorted) {
    const dim = dimensionById.get(q.dimension.dimensionId);
    const abbr = dim ? (DIMENSION_ABBREVIATION[dim.code] ?? dim.code[0]?.toUpperCase() ?? '?') : '?';
    const count = (dimCounters.get(q.dimension.dimensionId) ?? 0) + 1;
    dimCounters.set(q.dimension.dimensionId, count);
    codes.set(q.id, `${abbr}${count}`);
  }

  return codes;
}

/** Sub-group of questions within a dimension, optionally grouped by sub-dimension */
interface SubDimensionGroup {
  subDimension: SubDimension | null;
  questions: QuestionWithDimension[];
}

interface DimensionGroup {
  dimension: Dimension;
  questions: QuestionWithDimension[];
  subGroups: SubDimensionGroup[];
}

/**
 * Group questions by dimension for collapsible sections,
 * with optional sub-dimension grouping within each dimension.
 */
function groupByDimension(
  questions: QuestionWithDimension[],
  dimensions: Dimension[],
): DimensionGroup[] {
  const groups: DimensionGroup[] = [];

  // Build groups in dimension display order
  for (const dim of dimensions) {
    const dimQuestions = questions
      .filter((q) => q.dimension.dimensionId === dim.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    if (dimQuestions.length > 0) {
      groups.push({ dimension: dim, questions: dimQuestions, subGroups: buildSubGroups(dimQuestions) });
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
    groups.push({ dimension: unknownDim, questions: unassigned, subGroups: buildSubGroups(unassigned) });
  }

  return groups;
}

/** Build sub-dimension groupings within a set of questions */
function buildSubGroups(questions: QuestionWithDimension[]): SubDimensionGroup[] {
  // If no questions have sub-dimensions, return a single group with no header
  const hasSubDimensions = questions.some((q) => q.subDimension !== null);
  if (!hasSubDimensions) {
    return [{ subDimension: null, questions }];
  }

  const groups = new Map<string, SubDimensionGroup>();
  const unassigned: QuestionWithDimension[] = [];

  for (const q of questions) {
    if (q.subDimension) {
      const existing = groups.get(q.subDimension.id);
      if (existing) {
        existing.questions.push(q);
      } else {
        groups.set(q.subDimension.id, { subDimension: q.subDimension, questions: [q] });
      }
    } else {
      unassigned.push(q);
    }
  }

  const result: SubDimensionGroup[] = Array.from(groups.values()).sort(
    (a, b) => (a.subDimension?.displayOrder ?? 0) - (b.subDimension?.displayOrder ?? 0),
  );

  // Unassigned questions go at the end
  if (unassigned.length > 0) {
    result.push({ subDimension: null, questions: unassigned });
  }

  return result;
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

      // Prevent cross-dimension reordering — preserves framework integrity
      const activeQ = data.questions.find((q) => q.id === active.id);
      const overQ = data.questions.find((q) => q.id === over.id);
      if (!activeQ || !overQ || activeQ.dimension.dimensionId !== overQ.dimension.dimensionId) return;

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
      <div className="px-4 py-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load survey. Please try again.
        </div>
      </div>
    );
  }

  const { survey, dimensions, subDimensions, hasResponses } = data;
  const allQuestionIds = filteredQuestions.map((q) => q.id);
  const likertSize = survey.settings?.likertSize ?? 5;
  const reverseScoredCount = data.questions.filter((q) => q.reverseScored).length;

  return (
    <div className="px-4 py-6 pb-20 lg:px-8">
      {/* Header */}
      <DrilldownHeader backTo={`/admin/clients/${survey.organizationId}`} backLabel="Back to client" title={survey.title}>
        <AutoSaveIndicator status={autoSaveStatus} />
      </DrilldownHeader>

      {/* Template banner */}
      <div
        className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-4 text-sm text-[var(--grey-700)]"
        role="status"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" />
        <div>
          <p>
            This survey uses the <span className="font-medium">CC+C Culture Assessment</span> template.
            Questions are organized by dimension. Drag to reorder within the survey.
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {likertSize}-point Likert scale &middot; {reverseScoredCount} reverse-scored question{reverseScoredCount !== 1 ? 's' : ''}
          </p>
        </div>
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

                        {/* Question rows with optional sub-dimension grouping */}
                        {!isCollapsed && (
                          <div className="flex flex-col gap-2 pl-6">
                            {group.subGroups.map((subGroup, sgIdx) => (
                              <div key={subGroup.subDimension?.id ?? `ungrouped-${sgIdx}`}>
                                {subGroup.subDimension && (
                                  <p className="mb-1.5 mt-2 text-xs font-medium text-[var(--text-secondary)]">
                                    {subGroup.subDimension.name}
                                  </p>
                                )}
                                {subGroup.questions.map((question) => (
                                  <div key={question.id} className="mb-2">
                                    <QuestionRow
                                      question={question}
                                      isLocked={hasResponses}
                                      onEdit={setEditingQuestionId}
                                      questionCode={questionCodes.get(question.id) ?? '?'}
                                    />
                                  </div>
                                ))}
                              </div>
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
        <div className="flex items-center justify-between lg:px-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {data.questions.length} question{data.questions.length !== 1 ? 's' : ''} across{' '}
            {dimensions.length} dimension{dimensions.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={() => onBack(survey.organizationId)}
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
          subDimensions={subDimensions}
          dimensions={dimensions}
          questionDimensionId={editingQuestion.dimension.dimensionId || null}
        />
      )}
    </div>
  );
}
