/**
 * Admin survey list page.
 * Displays all surveys with status filter pills and a "New Survey" action.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { SurveyStatus } from '@compass/types';
import { PillTabNav, type PillTab } from '../../../../components/navigation/pill-tab-nav';
import { DrilldownHeader } from '../../../../components/navigation/drilldown-header';
import { useSurveys } from '../hooks/use-surveys';
import { useCreateSurvey } from '../hooks/use-create-survey';
import { SurveyCard } from './survey-card';

interface SurveyListPageProps {
  organizationId: string;
  userId: string;
  onSelectSurvey: (surveyId: string) => void;
  onConfigure?: (surveyId: string) => void;
  onEditQuestions?: (surveyId: string) => void;
  onCopyLink?: (surveyId: string) => void;
  onViewResults?: (surveyId: string) => void;
  onArchive?: (surveyId: string) => void;
  /** When provided, renders a DrilldownHeader with back navigation to the client. */
  clientName?: string;
  /** Route to navigate back to. Defaults to /admin/clients. */
  backTo?: string;
}

const STATUS_PILLS: PillTab[] = [
  { id: 'all', label: 'All' },
  { id: SurveyStatus.ACTIVE, label: 'Active' },
  { id: SurveyStatus.DRAFT, label: 'Draft' },
  { id: SurveyStatus.CLOSED, label: 'Closed' },
  { id: SurveyStatus.ARCHIVED, label: 'Archived' },
];

export function SurveyListPage({
  organizationId,
  userId,
  onSelectSurvey,
  onConfigure,
  onEditQuestions,
  onCopyLink,
  onViewResults,
  onArchive,
  clientName,
  backTo,
}: SurveyListPageProps): ReactElement {
  const [activeFilter, setActiveFilter] = useState('all');
  const statusFilter = activeFilter === 'all' ? undefined : (activeFilter as SurveyStatus);

  const { data: surveys, isLoading, error } = useSurveys({
    organizationId,
    statusFilter,
  });

  const createSurvey = useCreateSurvey();

  const handleCreateSurvey = useCallback((): void => {
    createSurvey.mutate(
      {
        organizationId,
        title: 'Untitled Survey',
        createdBy: userId,
      },
      {
        onSuccess: (survey) => {
          onSelectSurvey(survey.id);
        },
      },
    );
  }, [organizationId, userId, createSurvey, onSelectSurvey]);

  return (
    <div className="px-4 py-6 lg:px-8">
      {clientName && (
        <DrilldownHeader
          backTo={backTo ?? '/admin/clients'}
          backLabel="Back to client"
          title={`${clientName} — Surveys`}
        />
      )}
      <div className="mb-6 flex items-center justify-between">
        {!clientName && <h1 className="text-2xl font-bold text-[var(--grey-900)]">Surveys</h1>}
        <button
          type="button"
          onClick={handleCreateSurvey}
          disabled={createSurvey.isPending}
          className="rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createSurvey.isPending ? 'Creating\u2026' : '+ New Survey'}
        </button>
      </div>

      <div className="mb-6">
        <PillTabNav
          tabs={STATUS_PILLS}
          activeId={activeFilter}
          onSelect={setActiveFilter}
        />
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
          Loading surveys...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load surveys. Please try again.
        </div>
      )}

      {surveys && surveys.length === 0 && !isLoading && (
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
          {statusFilter
            ? `No ${statusFilter} surveys found.`
            : 'No surveys yet. Create your first survey to get started.'}
        </div>
      )}

      {surveys && surveys.length > 0 && (
        <div className="flex flex-col gap-3">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onClick={onSelectSurvey}
              onConfigure={onConfigure}
              onEditQuestions={onEditQuestions}
              onCopyLink={onCopyLink}
              onViewResults={onViewResults}
              onArchive={onArchive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
