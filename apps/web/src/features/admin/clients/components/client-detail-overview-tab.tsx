/**
 * Overview tab for client detail page.
 * Self-contained child route component at /clients/:orgId/overview.
 * Displays organization info, key metrics, admin notes, consultant assignment, and quick actions.
 * Two-column layout: 65% left (info, metrics, notes) / 35% right (consultant, actions).
 * Manages its own edit modal.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOrganization } from '../hooks/use-organization';
import { useCreateSurvey } from '../../surveys/hooks/use-create-survey';
import { useAuthStore } from '../../../../stores/auth-store';
import { OrgInfoCard } from './org-info-card';
import { KeyMetricsCard } from './key-metrics-card';
import { AdminNotes } from './admin-notes';
import { ConsultantCard } from './consultant-card';
import { EditOrgModal } from './edit-org-modal';

export interface ClientDetailOverviewTabProps {
  orgId: string;
}

/**
 * Overview tab component - self-contained with its own data fetching and modal state.
 */
export function ClientDetailOverviewTab({ orgId }: ClientDetailOverviewTabProps): ReactElement {
  const { data: organization, isLoading } = useOrganization(orgId);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createSurvey = useCreateSurvey();

  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleCreateSurvey = useCallback((): void => {
    createSurvey.mutate(
      {
        organizationId: orgId,
        title: 'Untitled Survey',
        createdBy: user?.id ?? '',
      },
      {
        onSuccess: (survey) => {
          void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId: survey.id } });
        },
      },
    );
  }, [orgId, user?.id, createSurvey, navigate]);

  const handleNavigateToSurveys = useCallback((): void => {
    void navigate({ to: '/admin/clients/$orgId/surveys', params: { orgId } });
  }, [orgId, navigate]);

  const handleNavigateToSurvey = useCallback(
    (surveyId: string): void => {
      void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId } });
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <div role="tabpanel" aria-label="Overview">
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading overview...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div role="tabpanel" aria-label="Overview">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Organization not found.
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" aria-label="Overview">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column (65%) */}
        <div className="flex flex-col gap-6 lg:w-[65%]">
          <OrgInfoCard organization={organization} onEdit={() => setEditModalOpen(true)} />
          <KeyMetricsCard
            organization={organization}
            onTotalSurveysClick={handleNavigateToSurveys}
            onActiveSurveyClick={handleNavigateToSurvey}
          />
          <AdminNotes orgId={orgId} />
        </div>

        {/* Right column (35%) */}
        <div className="flex flex-col gap-6 lg:w-[35%]">
          <ConsultantCard orgId={orgId} />

          {/* Quick Actions */}
          <nav aria-label="Quick actions" className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCreateSurvey}
                disabled={!!organization.activeSurveyId || createSurvey.isPending}
                className="w-full rounded-lg bg-[var(--color-core)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createSurvey.isPending ? 'Creating\u2026' : 'Create Survey'}
              </button>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="w-full rounded-lg border border-[var(--grey-100)] px-4 py-2 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)]"
              >
                Edit Client Info
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Edit modal */}
      {organization && (
        <EditOrgModal
          open={editModalOpen}
          organization={organization}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
