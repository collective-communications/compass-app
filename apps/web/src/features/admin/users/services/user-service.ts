/**
 * Supabase queries for CC+C team member and invitation management.
 * Handles listing team members, inviting new members, updating roles,
 * removing members, and managing pending invitations.
 */

import { supabase } from '../../../../lib/supabase';

/** CC+C internal team roles */
export type CccRole = 'ccc_admin' | 'ccc_member';

/** Client organization roles */
export type ClientRole = 'client_exec' | 'client_director' | 'client_manager';

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
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
  invitedBy: string;
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

/**
 * Fetches all CC+C team members (users with ccc_admin or ccc_member roles).
 */
export async function listTeamMembers(): Promise<TeamMember[]> {
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

/**
 * Fetches users assigned to a specific client organization.
 */
export async function listClientUsers(organizationId: string): Promise<TeamMember[]> {
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

/**
 * Fetches pending invitations, optionally filtered by organization.
 */
export async function listInvitations(organizationId?: string): Promise<Invitation[]> {
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

/**
 * Creates an invitation with a 7-day expiry.
 * The backend trigger sends the invitation email.
 */
export async function createInvitation(params: InviteParams): Promise<Invitation> {
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

/**
 * Resends an expired invitation by creating a new one with fresh expiry
 * and revoking the old one.
 */
export async function resendInvitation(invitationId: string): Promise<Invitation> {
  // Fetch original invitation
  const { data: original, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (fetchError) throw fetchError;

  // Revoke old invitation
  const { error: revokeError } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (revokeError) throw revokeError;

  // Create new invitation with fresh expiry
  return createInvitation({
    email: original.email,
    role: original.role as CccRole | ClientRole,
    organizationId: original.organization_id ?? undefined,
  });
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
}

/**
 * Updates a team member's role.
 * Caller must verify they are not editing their own role.
 */
export async function updateUserRole({ userId, role }: UpdateRoleParams): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Removes a team member.
 * Caller must verify this is not the last ccc_admin.
 */
export async function removeUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}
