/**
 * TanStack Query hooks for survey publishing and lifecycle management.
 * Manages survey config saving, publishing (activation), and unpublishing.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Survey, Deployment, DeploymentType } from '@compass/types';
import {
  saveSurveyConfig,
  publishSurvey,
  getActiveDeployment,
  unpublishSurvey,
  type SaveSurveyConfigParams,
} from '../services/deployment-service';
import { surveyBuilderKeys } from './use-survey-builder';

/** Query key factory for deployment queries */
export const deploymentKeys = {
  all: ['admin', 'deployments'] as const,
  active: (surveyId: string) => [...deploymentKeys.all, 'active', surveyId] as const,
};

export interface UseDeploymentManagementOptions {
  surveyId: string;
  enabled?: boolean;
}

export interface UseDeploymentManagementResult {
  /** Active deployment for this survey, if any */
  deployment: UseQueryResult<Deployment | null>;
  /** Save survey config (title, dates, settings) as draft */
  saveConfig: (params: Omit<SaveSurveyConfigParams, 'surveyId'>) => Promise<Survey>;
  /** Publish the survey (activate + create deployment) */
  publish: (deploymentType?: DeploymentType) => Promise<Deployment>;
  /** Unpublish (close survey early) */
  unpublish: () => Promise<void>;
  /** Whether any mutation is in progress */
  isPending: boolean;
}

/**
 * Manages survey publishing lifecycle: save config, publish, unpublish.
 * Invalidates relevant queries on mutation success.
 */
export function useDeploymentManagement({
  surveyId,
  enabled = true,
}: UseDeploymentManagementOptions): UseDeploymentManagementResult {
  const queryClient = useQueryClient();

  const deployment = useQuery({
    queryKey: deploymentKeys.active(surveyId),
    queryFn: () => getActiveDeployment(surveyId),
    enabled: enabled && !!surveyId,
  });

  const saveConfigMutation = useMutation({
    mutationFn: (params: Omit<SaveSurveyConfigParams, 'surveyId'>) =>
      saveSurveyConfig({ ...params, surveyId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (deploymentType: DeploymentType) =>
      publishSurvey({ surveyId, deploymentType }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deploymentKeys.active(surveyId) });
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const current = deployment.data;
      if (!current) throw new Error('No active deployment to close');
      return unpublishSurvey(surveyId, current.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deploymentKeys.active(surveyId) });
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });

  return {
    deployment,
    saveConfig: (params) => saveConfigMutation.mutateAsync(params),
    publish: (deploymentType = 'anonymous_link' as DeploymentType) =>
      publishMutation.mutateAsync(deploymentType),
    unpublish: () => unpublishMutation.mutateAsync(),
    isPending:
      saveConfigMutation.isPending || publishMutation.isPending || unpublishMutation.isPending,
  };
}
