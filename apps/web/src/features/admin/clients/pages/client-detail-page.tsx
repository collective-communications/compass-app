/**
 * Client detail page with tabbed layout.
 * Route: /clients/:orgId
 * Displays org info, metrics, notes, consultant, and quick actions.
 * Underline tab bar for Overview | Results | Surveys | Users (Overview default).
 */

import { useState, useCallback, type ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import { useOrganization, useArchiveOrganization, useUnarchiveOrganization } from '../hooks/use-organization';
import { OrgInfoCard } from '../components/org-info-card';
import { KeyMetricsCard } from '../components/key-metrics-card';
import { AdminNotes } from '../components/admin-notes';
import { ConsultantCard } from '../components/consultant-card';
import { EditOrgModal } from '../components/edit-org-modal';
import { ClientUsersTab } from '../components/client-users-tab';
import { DrilldownHeader } from '../../../../components/navigation/drilldown-header';
import { SurveyListPage } from '../../surveys';
import { SurveyConfigModal } from '../../surveys/components/survey-config-modal';
import { useCreateSurvey } from '../../surveys/hooks/use-create-survey';
import { useArchiveSurvey } from '../../surveys/hooks/use-archive-survey';
import { useSurveys } from '../../surveys/hooks/use-surveys';
import { useAuthStore } from '../../../../stores/auth-store';
import { getSurveyBuilderData } from '../../surveys/services/admin-survey-service';
import { useQuery } from '@tanstack/react-query';

export interface ClientDetailPageProps {
  orgId: string;
}

type DetailTab = 'overview' | 'results' | 'surveys' | 'users';

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'results', label: 'Results' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'users', label: 'Users' },
];

export function ClientDetailPage({ orgId }: ClientDetailPageProps): ReactElement {
  const { data: organization, isLoading, error } = useOrganization(orgId);
  const archiveOrg = useArchiveOrganization(orgId);
  const unarchiveOrg = useUnarchiveOrganization(orgId);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [configSurveyId, setConfigSurveyId] = useState<string | null>(null);
  const createSurvey = useCreateSurvey();
  const archiveSurvey = useArchiveSurvey();

  // Fetch surveys list for copy-link token lookup
  const { data: surveys } = useSurveys({ organizationId: orgId });

  // Fetch full survey data when config modal is open
  const { data: configSurveyData } = useQuery({
    queryKey: ['admin', 'survey-builder', configSurveyId],
    queryFn: () => getSurveyBuilderData(configSurveyId!),
    enabled: !!configSurveyId,
  });

  const isArchived = organization && 'archivedAt' in organization && !!(organization as Record<string, unknown>).archivedAt;

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

  const handleArchive = useCallback((): void => {
    setMenuOpen(false);
    setArchiveError(null);
    archiveOrg.mutate(undefined, {
      onError: (err) => {
        setArchiveError(err.message ?? 'Failed to archive client.');
      },
    });
  }, [archiveOrg]);

  const handleUnarchive = useCallback((): void => {
    setMenuOpen(false);
    setArchiveError(null);
    unarchiveOrg.mutate(undefined, {
      onError: (err) => {
        setArchiveError(err.message ?? 'Failed to unarchive client.');
      },
    });
  }, [unarchiveOrg]);

  const handleCopyLink = useCallback((surveyId: string): void => {
    const survey = surveys?.find((s) => s.id === surveyId);
    if (survey?.activeDeploymentToken) {
      const url = `${window.location.origin}/s/${survey.activeDeploymentToken}`;
      void navigator.clipboard.writeText(url);
    }
  }, [surveys]);

  const handleConfigSave = useCallback((): void => {
    setConfigSurveyId(null);
  }, []);

  const handleConfigPublish = useCallback((): void => {
    setConfigSurveyId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading client...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <DrilldownHeader backTo="/admin/clients" backLabel="Back to clients" title="Client not found" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load client. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Archived banner */}
      {isArchived && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800" role="status">
          <span>This client is archived.</span>
          <button
            type="button"
            onClick={handleUnarchive}
            disabled={unarchiveOrg.isPending}
            className="text-sm font-medium text-yellow-900 underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            {unarchiveOrg.isPending ? 'Restoring\u2026' : 'Unarchive'}
          </button>
        </div>
      )}

      {/* Archive error */}
      {archiveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {archiveError}
        </div>
      )}

      {/* Drilldown header */}
      <DrilldownHeader backTo="/admin/clients" backLabel="Back to clients" title={organization.name}>
        {/* Action menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-lg px-3 py-1.5 text-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)]"
            aria-label="Actions menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditModalOpen(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
              >
                Edit
              </button>
              {isArchived ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleUnarchive}
                  disabled={unarchiveOrg.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)] disabled:opacity-50"
                >
                  {unarchiveOrg.isPending ? 'Restoring\u2026' : 'Unarchive'}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleArchive}
                  disabled={archiveOrg.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)] disabled:opacity-50"
                >
                  {archiveOrg.isPending ? 'Archiving\u2026' : 'Archive'}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
              >
                Export
              </button>
            </div>
          )}
        </div>
      </DrilldownHeader>

      {/* Underline tab bar */}
      <div className="mb-6 border-b border-[var(--grey-100)]" role="tablist" aria-label="Client detail tabs">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'font-semibold text-[var(--grey-900)]'
                  : 'font-medium text-[var(--text-secondary)] hover:text-[var(--grey-700)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--grey-700)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left column (65%) */}
          <div className="flex flex-col gap-6 lg:w-[65%]">
            <OrgInfoCard organization={organization} onEdit={() => setEditModalOpen(true)} />
            <KeyMetricsCard
              organization={organization}
              onTotalSurveysClick={() => setActiveTab('surveys')}
              onActiveSurveyClick={(surveyId) => {
                void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId } });
              }}
            />
            <AdminNotes orgId={orgId} />
          </div>

          {/* Right column (35%) */}
          <div className="flex flex-col gap-6 lg:w-[35%]">
            <ConsultantCard orgId={orgId} />

            {/* Quick Actions */}
            <nav aria-label="Quick actions" className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
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
                  onClick={() => setActiveTab('results')}
                  className="w-full rounded-lg border border-[var(--grey-100)] px-4 py-2 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)]"
                >
                  View Results
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
      )}

      {activeTab === 'results' && (
        <div role="tabpanel" aria-label="Results">
          <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Results tab content will be added in a future wave.</p>
        </div>
      )}

      {activeTab === 'surveys' && (
        <div role="tabpanel" aria-label="Surveys">
          <SurveyListPage
            organizationId={orgId}
            userId={user?.id ?? ''}
            onSelectSurvey={(surveyId) => {
              void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId } });
            }}
            onConfigure={(surveyId) => setConfigSurveyId(surveyId)}
            onEditQuestions={(surveyId) => {
              void navigate({ to: '/admin/surveys/$surveyId', params: { surveyId } });
            }}
            onCopyLink={handleCopyLink}
            onViewResults={(surveyId) => {
              void navigate({ to: '/admin/surveys/$surveyId/deploy', params: { surveyId } });
            }}
            onArchive={(surveyId) => archiveSurvey.mutate(surveyId)}
          />
        </div>
      )}

      {activeTab === 'users' && (
        <div role="tabpanel" aria-label="Users">
          <ClientUsersTab organizationId={orgId} />
        </div>
      )}

      {/* Edit modal */}
      <EditOrgModal
        open={editModalOpen}
        organization={organization}
        onClose={() => setEditModalOpen(false)}
      />

      {/* Survey config modal */}
      {configSurveyId && configSurveyData && (
        <SurveyConfigModal
          open={true}
          onClose={() => setConfigSurveyId(null)}
          survey={configSurveyData.survey}
          hasQuestions={configSurveyData.questions.length > 0}
          onSave={handleConfigSave}
          onDeploy={handleConfigPublish}
          isPending={false}
        />
      )}
    </div>
  );
}
