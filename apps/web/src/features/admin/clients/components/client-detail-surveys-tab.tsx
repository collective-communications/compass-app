/**
 * Surveys tab component for client detail page.
 * Owns survey list state, config modal state, and survey-related callbacks.
 * Renders the survey list with copy-link, config, and archive capabilities.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SurveyListPage } from '../../surveys';
import { SurveyConfigModal, type SurveyConfigFormData } from '../../surveys/components/survey-config-modal';
import { useArchiveSurvey } from '../../surveys/hooks/use-archive-survey';
import { useDeploymentManagement } from '../../surveys/hooks/use-deployment-management';
import { useSurveys, surveyListKeys } from '../../surveys/hooks/use-surveys';
import { getSurveyBuilderData } from '../../surveys/services/admin-survey-service';

export interface ClientDetailSurveysTabProps {
  organizationId: string;
  userId: string;
  /** Navigate to the question builder (`/surveys/$surveyId`). */
  onNavigateToBuilder: (surveyId: string) => void;
  /** Navigate to the live deployment tracker (`/surveys/$surveyId/publish`). */
  onNavigateToTracking: (surveyId: string) => void;
  /** Navigate to the results compass (`/results/$surveyId/compass`). */
  onNavigateToResults: (surveyId: string) => void;
  onArchive?: (surveyId: string) => void;
}

/**
 * ClientDetailSurveysTab component
 * Manages survey list, config modal state, and survey-related operations.
 * @param props - Component props
 * @returns Rendered surveys tab with list and config modal
 */
export function ClientDetailSurveysTab({
  organizationId,
  userId,
  onNavigateToBuilder,
  onNavigateToTracking,
  onNavigateToResults,
  onArchive,
}: ClientDetailSurveysTabProps): ReactElement {
  const [configSurveyId, setConfigSurveyId] = useState<string | null>(null);
  const archiveSurvey = useArchiveSurvey();
  const queryClient = useQueryClient();

  // Fetch surveys list for copy-link token lookup
  const { data: surveys } = useSurveys({ organizationId });

  const { saveConfig, publish, isPending: deploymentPending } = useDeploymentManagement({
    surveyId: configSurveyId ?? '',
    enabled: !!configSurveyId,
  });

  // Fetch full survey data when config modal is open
  const { data: configSurveyData } = useQuery({
    queryKey: ['admin', 'survey-builder', configSurveyId],
    queryFn: () => getSurveyBuilderData(configSurveyId!),
    enabled: !!configSurveyId,
  });

  const handleCopyLink = useCallback(
    (surveyId: string): void => {
      const survey = surveys?.find((s) => s.id === surveyId);
      if (survey?.activeDeploymentToken) {
        const url = `${window.location.origin}/s/${survey.activeDeploymentToken}`;
        void navigator.clipboard.writeText(url);
      }
    },
    [surveys],
  );

  const handleConfigSave = useCallback(
    async (config: SurveyConfigFormData): Promise<void> => {
      await saveConfig(config);
      void queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
      setConfigSurveyId(null);
    },
    [saveConfig, queryClient],
  );

  const handleConfigPublish = useCallback(
    async (config: SurveyConfigFormData): Promise<void> => {
      const surveyId = configSurveyId;
      if (!surveyId) return;
      await saveConfig(config);
      await publish();
      void queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
      setConfigSurveyId(null);
      onNavigateToTracking(surveyId);
    },
    [configSurveyId, saveConfig, publish, queryClient, onNavigateToTracking],
  );

  const handleArchive = useCallback(
    (surveyId: string): void => {
      archiveSurvey.mutate(surveyId);
      if (onArchive) {
        onArchive(surveyId);
      }
    },
    [archiveSurvey, onArchive],
  );

  // Status-aware default action for the card's primary click target.
  // Drafts open the config modal (next step is setup); active/paused go to the
  // live tracker; closed/archived go to results. Newly-created surveys aren't
  // in the cached list yet — they're drafts, so default to the config modal.
  const handleSelectSurvey = useCallback(
    (surveyId: string): void => {
      const survey = surveys?.find((s) => s.id === surveyId);
      const status = survey?.status ?? 'draft';
      switch (status) {
        case 'active':
        case 'paused':
          onNavigateToTracking(surveyId);
          return;
        case 'closed':
        case 'archived':
          onNavigateToResults(surveyId);
          return;
        case 'draft':
        default:
          setConfigSurveyId(surveyId);
      }
    },
    [surveys, onNavigateToTracking, onNavigateToResults],
  );

  return (
    <>
      <div role="tabpanel" id="client-detail-panel-surveys" aria-labelledby="client-detail-surveys">
        <SurveyListPage
          organizationId={organizationId}
          userId={userId}
          onSelectSurvey={handleSelectSurvey}
          onConfigure={(surveyId) => setConfigSurveyId(surveyId)}
          onEditQuestions={onNavigateToBuilder}
          onCopyLink={handleCopyLink}
          onViewResults={onNavigateToResults}
          onArchive={handleArchive}
        />
      </div>

      {/* Survey config modal */}
      {configSurveyId && configSurveyData && (
        <SurveyConfigModal
          open={true}
          onClose={() => setConfigSurveyId(null)}
          survey={configSurveyData.survey}
          hasQuestions={configSurveyData.questions.length > 0}
          onSave={handleConfigSave}
          onDeploy={handleConfigPublish}
          isPending={deploymentPending}
        />
      )}
    </>
  );
}
