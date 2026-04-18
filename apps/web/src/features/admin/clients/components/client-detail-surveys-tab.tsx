/**
 * Surveys tab component for client detail page.
 * Owns survey list state, config modal state, and survey-related callbacks.
 * Renders the survey list with copy-link, config, and archive capabilities.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SurveyListPage } from '../../surveys';
import { SurveyConfigModal } from '../../surveys/components/survey-config-modal';
import { useArchiveSurvey } from '../../surveys/hooks/use-archive-survey';
import { useSurveys } from '../../surveys/hooks/use-surveys';
import { getSurveyBuilderData } from '../../surveys/services/admin-survey-service';

export interface ClientDetailSurveysTabProps {
  organizationId: string;
  userId: string;
  onSelectSurvey: (surveyId: string) => void;
  onEditQuestions: (surveyId: string) => void;
  onViewResults: (surveyId: string) => void;
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
  onSelectSurvey,
  onEditQuestions,
  onViewResults,
  onArchive,
}: ClientDetailSurveysTabProps): ReactElement {
  const [configSurveyId, setConfigSurveyId] = useState<string | null>(null);
  const archiveSurvey = useArchiveSurvey();

  // Fetch surveys list for copy-link token lookup
  const { data: surveys } = useSurveys({ organizationId });

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

  const handleConfigSave = useCallback((): void => {
    setConfigSurveyId(null);
  }, []);

  const handleConfigPublish = useCallback((): void => {
    setConfigSurveyId(null);
  }, []);

  const handleArchive = useCallback(
    (surveyId: string): void => {
      archiveSurvey.mutate(surveyId);
      if (onArchive) {
        onArchive(surveyId);
      }
    },
    [archiveSurvey, onArchive],
  );

  return (
    <>
      <div role="tabpanel" id="client-detail-panel-surveys" aria-labelledby="client-detail-surveys">
        <SurveyListPage
          organizationId={organizationId}
          userId={userId}
          onSelectSurvey={onSelectSurvey}
          onConfigure={(surveyId) => setConfigSurveyId(surveyId)}
          onEditQuestions={onEditQuestions}
          onCopyLink={handleCopyLink}
          onViewResults={onViewResults}
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
          isPending={false}
        />
      )}
    </>
  );
}
