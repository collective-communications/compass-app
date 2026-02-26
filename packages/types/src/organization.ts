/**
 * Organization domain types for client management.
 * Maps to the organizations table and related aggregations.
 *
 * DB columns are snake_case; TypeScript interfaces use camelCase.
 */

/** Organization record from the organizations table */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  employeeCount: number | null;
  logoUrl: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  createdAt: string;
}

/** Organization with aggregated survey and scoring data for list display */
export interface OrganizationSummary extends Organization {
  totalSurveys: number;
  activeSurveyId: string | null;
  activeSurveyTitle: string | null;
  responseCount: number | null;
  completionRate: number | null;
  daysRemaining: number | null;
  lastScore: number | null;
  scoreTrend: 'up' | 'down' | 'stable' | null;
  assignedConsultant: string | null;
}

/** Parameters for creating a new organization */
export interface CreateOrganizationParams {
  name: string;
  industry?: string;
  employeeCount?: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
}
