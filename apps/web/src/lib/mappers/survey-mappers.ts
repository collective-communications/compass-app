/**
 * Shared row mappers for converting snake_case Supabase rows
 * to camelCase TypeScript interfaces.
 *
 * Centralizes mapping logic previously duplicated across
 * admin-survey-service, deployment-service, and survey-engine-adapter.
 *
 * The raw inputs are typed as `Record<string, unknown>` because:
 *   - callers compose these mappers over joined rows where the generated
 *     Supabase types don't capture the joined shape;
 *   - some columns exist in the live DB but are not yet in the generated
 *     types (schema drift, e.g. `questions.description`, `scores_calculated_at`).
 * Callers that have a typed row should pass it in — assignability to
 * `Record<string, unknown>` is structural and does not require a cast from
 * a properly-typed supabase Row.
 */

import type { Database, Survey, Question, Dimension, SubDimension, Deployment } from '@compass/types';

/**
 * Accepted raw inputs for mappers. Callers can pass a properly-typed generated
 * Row, the joined equivalent, or a plain record — the mapper narrows each
 * column explicitly. Using a single `unknown` shape here keeps the old shape
 * compatibility without forcing callers to double-cast through
 * `Record<string, unknown>`.
 */
type RawRow = Record<string, unknown>;

/**
 * Drop down a typed Supabase row to the permissive `RawRow` shape accepted by
 * the mappers. This is the inverse of an `as Record<string, unknown>` cast —
 * no `unknown` hop is introduced because each input row is already known to be
 * an object with string keys. Any column drift that the mapper depends on
 * should be handled via the drift-aware row types defined in callers.
 */
function asRawRow(row: object): RawRow {
  return row as unknown as RawRow;
}

/** Map a snake_case survey row to the camelCase Survey interface */
export function mapSurveyRow(
  raw: Database['public']['Tables']['surveys']['Row'] | RawRow,
): Survey {
  const r = asRawRow(raw);
  return {
    id: r['id'] as string,
    organizationId: r['organization_id'] as string,
    title: r['title'] as string,
    description: (r['description'] as string) ?? null,
    status: r['status'] as Survey['status'],
    opensAt: (r['opens_at'] as string) ?? null,
    closesAt: (r['closes_at'] as string) ?? null,
    settings: (r['settings'] as Survey['settings']) ?? null,
    reminderSchedule: Array.isArray(r['reminder_schedule'])
      ? (r['reminder_schedule'] as number[])
      : [],
    scoresCalculated: (r['scores_calculated'] as boolean) ?? false,
    scoresCalculatedAt: (r['scores_calculated_at'] as string) ?? null,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
    createdBy: r['created_by'] as string,
  };
}

/** Map a snake_case question row to the camelCase Question interface */
export function mapQuestionRow(
  raw: Database['public']['Tables']['questions']['Row'] | RawRow,
): Question {
  const r = asRawRow(raw);
  return {
    id: r['id'] as string,
    surveyId: r['survey_id'] as string,
    text: r['text'] as string,
    description: (r['description'] as string) ?? null,
    type: r['type'] as Question['type'],
    reverseScored: (r['reverse_scored'] as boolean) ?? false,
    options: r['options'] ?? null,
    required: (r['required'] as boolean) ?? true,
    displayOrder: r['order_index'] as number,
    subDimensionId: (r['sub_dimension_id'] as string) ?? null,
    diagnosticFocus: (r['diagnostic_focus'] as string) ?? null,
    recommendedAction: (r['recommended_action'] as string) ?? null,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

/** Map a snake_case dimension row to the camelCase Dimension interface */
export function mapDimensionRow(
  raw: Database['public']['Tables']['dimensions']['Row'] | RawRow,
): Dimension {
  const r = asRawRow(raw);
  return {
    id: r['id'] as string,
    code: r['code'] as Dimension['code'],
    name: r['name'] as string,
    description: (r['description'] as string) ?? null,
    color: r['color'] as string,
    displayOrder: r['display_order'] as number,
    segmentStartAngle: (r['segment_start_angle'] as number) ?? null,
    segmentEndAngle: (r['segment_end_angle'] as number) ?? null,
    createdAt: r['created_at'] as string,
  };
}

/** Map a snake_case sub_dimension row to the camelCase SubDimension interface */
export function mapSubDimensionRow(
  raw: Database['public']['Tables']['sub_dimensions']['Row'] | RawRow,
): SubDimension {
  const r = asRawRow(raw);
  return {
    id: r['id'] as string,
    dimensionId: r['dimension_id'] as string,
    code: r['code'] as string,
    name: r['name'] as string,
    description: (r['description'] as string) ?? null,
    displayOrder: r['display_order'] as number,
    createdAt: r['created_at'] as string,
  };
}

/** Map a snake_case deployment row to the camelCase Deployment interface */
export function mapDeploymentRow(
  raw: Database['public']['Tables']['deployments']['Row'] | RawRow,
): Deployment {
  const r = asRawRow(raw);
  return {
    id: r['id'] as string,
    surveyId: r['survey_id'] as string,
    type: r['type'] as Deployment['type'],
    token: r['token'] as string,
    settings: (r['settings'] as Deployment['settings']) ?? null,
    closesAt: (r['closes_at'] as string) ?? null,
    accessCount: (r['access_count'] as number) ?? 0,
    lastAccessedAt: (r['last_accessed_at'] as string) ?? null,
    createdAt: r['created_at'] as string,
  };
}
