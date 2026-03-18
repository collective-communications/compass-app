/**
 * Shared row mappers for converting snake_case Supabase rows
 * to camelCase TypeScript interfaces.
 *
 * Centralizes mapping logic previously duplicated across
 * admin-survey-service, deployment-service, and survey-engine-adapter.
 */

import type { Survey, Question, Dimension, SubDimension, Deployment } from '@compass/types';

/** Map a snake_case survey row to the camelCase Survey interface */
export function mapSurveyRow(raw: Record<string, unknown>): Survey {
  return {
    id: raw['id'] as string,
    organizationId: raw['organization_id'] as string,
    title: raw['title'] as string,
    description: (raw['description'] as string) ?? null,
    status: raw['status'] as Survey['status'],
    opensAt: (raw['opens_at'] as string) ?? null,
    closesAt: (raw['closes_at'] as string) ?? null,
    settings: (raw['settings'] as Survey['settings']) ?? null,
    scoresCalculated: (raw['scores_calculated'] as boolean) ?? false,
    scoresCalculatedAt: (raw['scores_calculated_at'] as string) ?? null,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    createdBy: raw['created_by'] as string,
  };
}

/** Map a snake_case question row to the camelCase Question interface */
export function mapQuestionRow(raw: Record<string, unknown>): Question {
  return {
    id: raw['id'] as string,
    surveyId: raw['survey_id'] as string,
    text: raw['text'] as string,
    description: (raw['description'] as string) ?? null,
    type: raw['type'] as Question['type'],
    reverseScored: (raw['reverse_scored'] as boolean) ?? false,
    options: raw['options'] ?? null,
    required: (raw['required'] as boolean) ?? true,
    displayOrder: raw['order_index'] as number,
    subDimensionId: (raw['sub_dimension_id'] as string) ?? null,
    diagnosticFocus: (raw['diagnostic_focus'] as string) ?? null,
    recommendedAction: (raw['recommended_action'] as string) ?? null,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
  };
}

/** Map a snake_case dimension row to the camelCase Dimension interface */
export function mapDimensionRow(raw: Record<string, unknown>): Dimension {
  return {
    id: raw['id'] as string,
    code: raw['code'] as Dimension['code'],
    name: raw['name'] as string,
    description: (raw['description'] as string) ?? null,
    color: raw['color'] as string,
    displayOrder: raw['display_order'] as number,
    segmentStartAngle: (raw['segment_start_angle'] as number) ?? null,
    segmentEndAngle: (raw['segment_end_angle'] as number) ?? null,
    createdAt: raw['created_at'] as string,
  };
}

/** Map a snake_case sub_dimension row to the camelCase SubDimension interface */
export function mapSubDimensionRow(raw: Record<string, unknown>): SubDimension {
  return {
    id: raw['id'] as string,
    dimensionId: raw['dimension_id'] as string,
    code: raw['code'] as string,
    name: raw['name'] as string,
    description: (raw['description'] as string) ?? null,
    displayOrder: raw['display_order'] as number,
    createdAt: raw['created_at'] as string,
  };
}

/** Map a snake_case deployment row to the camelCase Deployment interface */
export function mapDeploymentRow(raw: Record<string, unknown>): Deployment {
  return {
    id: raw['id'] as string,
    surveyId: raw['survey_id'] as string,
    type: raw['type'] as Deployment['type'],
    token: raw['token'] as string,
    settings: (raw['settings'] as Deployment['settings']) ?? null,
    expiresAt: (raw['expires_at'] as string) ?? null,
    accessCount: (raw['access_count'] as number) ?? 0,
    lastAccessedAt: (raw['last_accessed_at'] as string) ?? null,
    createdAt: raw['created_at'] as string,
  };
}
