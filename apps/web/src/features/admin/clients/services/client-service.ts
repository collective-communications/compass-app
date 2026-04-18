/**
 * Supabase queries for admin client/organization management.
 * Handles listing organizations with survey aggregations and creating new ones.
 */

import type { Database, Organization, OrganizationSummary, CreateOrganizationParams } from '@compass/types';
import { supabase } from '../../../../lib/supabase';

type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];

/**
 * Fetches all organizations with aggregated survey statistics.
 * Joins surveys and organization_settings (which owns logo_url) to compute active
 * survey info, totals, and scoring.
 */
export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      surveys:surveys(
        id,
        title,
        status,
        closes_at
      ),
      organization_settings(logo_url)
    `)
    .order('name')
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((org) => {
    const surveys = (org.surveys ?? []) as Array<{
      id: string;
      title: string;
      status: string;
      closes_at: string | null;
    }>;

    const activeSurvey = surveys.find((s) => s.status === 'active') ?? null;
    let daysRemaining: number | null = null;

    if (activeSurvey?.closes_at) {
      const diffMs = new Date(activeSurvey.closes_at).getTime() - Date.now();
      daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
    }

    // organization_settings is a 1:1 relation — supabase-js returns it as an
    // array for to-many shape, or a single object/null for to-one. Normalize.
    const settings = Array.isArray(org.organization_settings)
      ? org.organization_settings[0]
      : org.organization_settings;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      industry: org.industry,
      employeeCount: org.employee_count,
      logoUrl: settings?.logo_url ?? null,
      primaryContactName: org.primary_contact_name,
      primaryContactEmail: org.primary_contact_email,
      createdAt: org.created_at,
      totalSurveys: surveys.length,
      activeSurveyId: activeSurvey?.id ?? null,
      activeSurveyTitle: activeSurvey?.title ?? null,
      responseCount: null,
      completionRate: null,
      daysRemaining,
      lastScore: null,
      scoreTrend: null,
      assignedConsultant: null,
    } satisfies OrganizationSummary;
  });
}

/**
 * Creates a new organization.
 * Generates a URL-safe slug from the name.
 */
export async function createOrganization(params: CreateOrganizationParams): Promise<Organization> {
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const insertPayload: OrganizationInsert = {
    name: params.name,
    slug,
    industry: params.industry ?? null,
    employee_count: params.employeeCount ?? null,
    primary_contact_name: params.primaryContactName ?? null,
    primary_contact_email: params.primaryContactEmail ?? null,
  };

  const { data, error } = await supabase
    .from('organizations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    industry: data.industry,
    employeeCount: data.employee_count,
    // logo_url lives on organization_settings; a newly created org has no settings row yet.
    logoUrl: null,
    primaryContactName: data.primary_contact_name,
    primaryContactEmail: data.primary_contact_email,
    createdAt: data.created_at,
  };
}
