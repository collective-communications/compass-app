/**
 * TanStack Query hooks for team member and invitation management.
 * Provides queries and mutations for the CC+C team page and client users tab.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  listTeamMembers,
  listClientUsers,
  listInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  updateUserRole,
  removeUser,
  type TeamMember,
  type Invitation,
  type InviteParams,
  type UpdateRoleParams,
} from '../services/user-service';

/** Query key factory for user/invitation queries */
export const teamMemberKeys = {
  all: ['admin', 'team-members'] as const,
  list: () => [...teamMemberKeys.all, 'list'] as const,
  clientUsers: (orgId: string) => [...teamMemberKeys.all, 'client', orgId] as const,
  invitations: (orgId?: string) => [...teamMemberKeys.all, 'invitations', orgId ?? 'ccc'] as const,
};

/**
 * Fetches CC+C team members (ccc_admin, ccc_member roles).
 */
export function useTeamMembers(): UseQueryResult<TeamMember[]> {
  return useQuery({
    queryKey: teamMemberKeys.list(),
    queryFn: listTeamMembers,
  });
}

/**
 * Fetches users assigned to a specific client organization.
 */
export function useClientUsers(organizationId: string): UseQueryResult<TeamMember[]> {
  return useQuery({
    queryKey: teamMemberKeys.clientUsers(organizationId),
    queryFn: () => listClientUsers(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Fetches pending invitations, optionally scoped to an organization.
 */
export function useInvitations(organizationId?: string): UseQueryResult<Invitation[]> {
  return useQuery({
    queryKey: teamMemberKeys.invitations(organizationId),
    queryFn: () => listInvitations(organizationId),
  });
}

/**
 * Creates an invitation and invalidates the invitations cache.
 */
export function useCreateInvitation(
  organizationId?: string,
): UseMutationResult<Invitation, Error, InviteParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: teamMemberKeys.invitations(organizationId),
      });
    },
  });
}

/**
 * Resends an expired invitation (revokes old, creates new with fresh expiry).
 */
export function useResendInvitation(
  organizationId?: string,
): UseMutationResult<Invitation, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: teamMemberKeys.invitations(organizationId),
      });
    },
  });
}

/**
 * Revokes a pending invitation.
 */
export function useRevokeInvitation(
  organizationId?: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: teamMemberKeys.invitations(organizationId),
      });
    },
  });
}

/**
 * Updates a user's role and invalidates the relevant cache.
 */
export function useUpdateRole(
  organizationId?: string,
): UseMutationResult<void, Error, UpdateRoleParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      if (organizationId) {
        void queryClient.invalidateQueries({
          queryKey: teamMemberKeys.clientUsers(organizationId),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: teamMemberKeys.list(),
        });
      }
    },
  });
}

/**
 * Removes a user and invalidates the relevant cache.
 */
export function useRemoveUser(
  organizationId?: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeUser(organizationId ? { userId, organizationId } : userId),
    onSuccess: () => {
      if (organizationId) {
        void queryClient.invalidateQueries({
          queryKey: teamMemberKeys.clientUsers(organizationId),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: teamMemberKeys.list(),
        });
      }
    },
  });
}
