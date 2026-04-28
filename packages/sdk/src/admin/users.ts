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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('role', ['ccc_admin', 'ccc_member'])
    .order('full_name');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as CccRole,
    assignedClients: row.assigned_clients ?? [],
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
  }));
}

export async function listClientUsers(organizationId: string): Promise<TeamMember[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('role', ['client_exec', 'client_director', 'client_manager'])
    .contains('assigned_clients', [organizationId])
    .order('full_name');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as ClientRole,
    assignedClients: row.assigned_clients ?? [],
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
  }));
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

export async function updateUserRole({ userId, role }: UpdateRoleParams): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}

export async function removeUser(userId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}
