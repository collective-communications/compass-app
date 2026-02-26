/**
 * TanStack Query hooks for deployment CRUD and activation.
 * Manages survey config saving, deployment creation, and deactivation.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Survey, Deployment, DeploymentType } from '@compass/types';
import {
  saveSurveyConfig,
  deploySurvey,
  getActiveDeployment,
  deactivateDeployment,
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
  /** Deploy the survey (activate + create deployment) */
  deploy: (deploymentType?: DeploymentType) => Promise<Deployment>;
  /** Deactivate deployment (close survey early) */
  deactivate: () => Promise<void>;
  /** Whether any mutation is in progress */
  isPending: boolean;
}

/**
 * Manages deployment lifecycle: save config, deploy, deactivate.
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

  const deployMutation = useMutation({
    mutationFn: (deploymentType: DeploymentType) =>
      deploySurvey({ surveyId, deploymentType }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deploymentKeys.active(surveyId) });
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const current = deployment.data;
      if (!current) throw new Error('No active deployment to deactivate');
      return deactivateDeployment(surveyId, current.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deploymentKeys.active(surveyId) });
      void queryClient.invalidateQueries({ queryKey: surveyBuilderKeys.detail(surveyId) });
    },
  });

  return {
    deployment,
    saveConfig: (params) => saveConfigMutation.mutateAsync(params),
    deploy: (deploymentType = 'anonymous_link' as DeploymentType) =>
      deployMutation.mutateAsync(deploymentType),
    deactivate: () => deactivateMutation.mutateAsync(),
    isPending:
      saveConfigMutation.isPending || deployMutation.isPending || deactivateMutation.isPending,
  };
}
