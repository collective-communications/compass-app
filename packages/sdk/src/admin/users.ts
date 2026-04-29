/**
 * Supabase queries for CC+C team member and invitation management.
 */

import { getClient } from '../runtime';

export type CccRole = 'ccc_admin' | 'ccc_member';
export type ClientRole = 'client_exec' | 'client_director' | 'client_manager';

export interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: CccRole | ClientRole;
  assignedClients: string[];
  lastActiveAt: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: CccRole | ClientRole;
  organizationId: string | null;
  expiresAt: string;
  createdAt: string;
  invitedBy: string | null;
}

export interface InviteParams {
  email: string;
  role: CccRole | ClientRole;
  organizationId?: string;
}

export interface UpdateRoleParams {
  userId: string;
  role: CccRole | ClientRole;
  organizationId?: string;
}

type RemoveUserParams = string | { userId: string; organizationId?: string };

interface OrgMemberRow {
  organization_id: string;
  user_id: string;
  role: CccRole | ClientRole;
  created_at: string;
}

interface UserProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
  created_at: string;
}

async function edgeFunctionErrorMessage(
  error: Error,
  response: Response | undefined,
  fallback: string,
): Promise<string> {
  if (!response) return error.message || fallback;

  try {
    const body = await response.clone().json() as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof body.message === 'string' && body.message.trim() !== '') {
      return body.message;
    }
    if (typeof body.error === 'string' && body.error.trim() !== '') {
      return body.error;
    }
  } catch {
    // Fall through to the Supabase client error message below.
  }

  return error.message || fallback;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = getClient();
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('organization_id, user_id, role, created_at')
    .in('role', ['ccc_admin', 'ccc_member'])
    .order('created_at');

  if (error) throw error;

  return hydrateMembers((memberships ?? []) as OrgMemberRow[]);
}

export async function listClientUsers(organizationId: string): Promise<TeamMember[]> {
  const supabase = getClient();
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('organization_id, user_id, role, created_at')
    .eq('organization_id', organizationId)
    .in('role', ['client_exec', 'client_director', 'client_manager'])
    .order('created_at');

  if (error) throw error;

  return hydrateMembers((memberships ?? []) as OrgMemberRow[]);
}

export async function listInvitations(organizationId?: string): Promise<Invitation[]> {
  const supabase = getClient();
  let query = supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  } else {
    query = query.is('organization_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as CccRole | ClientRole,
    organizationId: row.organization_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    invitedBy: row.invited_by,
  }));
}

export async function createInvitation(params: InviteParams): Promise<Invitation> {
  const supabase = getClient();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email: params.email,
      role: params.role,
      organization_id: params.organizationId ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  const { error: invokeError, response } = await supabase.functions.invoke('send-team-invitation', {
    body: { invitationId: data.id },
  });

  if (invokeError) {
    throw new Error(await edgeFunctionErrorMessage(
      invokeError,
      response,
      'Failed to send invitation email',
    ));
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role as CccRole | ClientRole,
    organizationId: data.organization_id,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    invitedBy: data.invited_by,
  };
}

export async function resendInvitation(invitationId: string): Promise<Invitation> {
  const supabase = getClient();
  const { data: original, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (fetchError) throw fetchError;

  const { error: revokeError } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (revokeError) throw revokeError;

  return createInvitation({
    email: original.email,
    role: original.role as CccRole | ClientRole,
    organizationId: original.organization_id ?? undefined,
  });
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
}

export async function updateUserRole({ userId, role, organizationId }: UpdateRoleParams): Promise<void> {
  const supabase = getClient();
  let query = supabase
    .from('org_members')
    .update({ role })
    .eq('user_id', userId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) throw error;
}

export async function removeUser(params: RemoveUserParams): Promise<void> {
  const supabase = getClient();
  const userId = typeof params === 'string' ? params : params.userId;
  const organizationId = typeof params === 'string' ? undefined : params.organizationId;
  let query = supabase
    .from('org_members')
    .delete()
    .eq('user_id', userId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) throw error;
}

async function hydrateMembers(memberships: OrgMemberRow[]): Promise<TeamMember[]> {
  if (memberships.length === 0) return [];

  const supabase = getClient();
  const profileIds = [...new Set(memberships.map((row) => row.user_id))];
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, avatar_url, last_active_at, created_at')
    .in('id', profileIds);

  if (error) throw error;

  const profilesById = new Map(
    ((profiles ?? []) as UserProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const assignedClientsByUser = new Map<string, string[]>();

  for (const membership of memberships) {
    const assigned = assignedClientsByUser.get(membership.user_id) ?? [];
    assigned.push(membership.organization_id);
    assignedClientsByUser.set(membership.user_id, assigned);
  }

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);

    return {
      id: membership.user_id,
      email: profile?.email ?? '',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: membership.role,
      assignedClients: assignedClientsByUser.get(membership.user_id) ?? [],
      lastActiveAt: profile?.last_active_at ?? null,
      createdAt: profile?.created_at ?? membership.created_at,
    };
  });
}
