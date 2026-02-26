/**
 * CC+C team management page.
 * Route: /settings/users
 * Two-column desktop layout: team members (left, 560px) and invitations (right).
 * Manages ccc_admin and ccc_member roles for the internal CC+C team.
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { useAuthStore } from '../../../../stores/auth-store';
import {
  useTeamMembers,
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateRole,
  useRemoveUser,
} from '../hooks/use-team-members';
import { UserCard } from '../components/user-card';
import { InviteForm } from '../components/invite-form';
import { PendingInvitations } from '../components/pending-invitations';
import type { CccRole, ClientRole } from '../services/user-service';

const CCC_ROLES = [
  { value: 'ccc_admin', label: 'Admin' },
  { value: 'ccc_member', label: 'Member' },
] as const;

export function UsersPage(): ReactElement {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [], isLoading: membersLoading, error: membersError } = useTeamMembers();
  const { data: invitations = [], isLoading: invitationsLoading } = useInvitations();

  const createInvite = useCreateInvitation();
  const resendInvite = useResendInvitation();
  const revokeInvite = useRevokeInvitation();
  const updateRole = useUpdateRole();
  const removeUser = useRemoveUser();

  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});

  const totalAdmins = useMemo(
    () => members.filter((m) => m.role === 'ccc_admin').length,
    [members],
  );

  const existingEmails = useMemo(() => members.map((m) => m.email.toLowerCase()), [members]);
  const pendingEmails = useMemo(() => invitations.map((i) => i.email.toLowerCase()), [invitations]);

  const handleRoleChange = useCallback(
    (userId: string, role: CccRole | ClientRole): void => {
      setRoleErrors((prev) => ({ ...prev, [userId]: '' }));
      updateRole.mutate(
        { userId, role },
        {
          onError: (err) => {
            setRoleErrors((prev) => ({
              ...prev,
              [userId]: err.message ?? 'Failed to update role.',
            }));
          },
        },
      );
    },
    [updateRole],
  );

  const handleRemove = useCallback(
    (userId: string): void => {
      const member = members.find((m) => m.id === userId);
      if (member?.role === 'ccc_admin' && totalAdmins <= 1) {
        setRemoveErrors((prev) => ({
          ...prev,
          [userId]: 'Cannot remove the last admin.',
        }));
        return;
      }

      setRemoveErrors((prev) => ({ ...prev, [userId]: '' }));
      removeUser.mutate(userId, {
        onError: (err) => {
          setRemoveErrors((prev) => ({
            ...prev,
            [userId]: err.message ?? 'Failed to remove member.',
          }));
        },
      });
    },
    [members, totalAdmins, removeUser],
  );

  const handleInvite = useCallback(
    (email: string, role: CccRole | ClientRole): void => {
      createInvite.mutate({ email, role });
    },
    [createInvite],
  );

  if (membersLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="py-12 text-center text-sm text-[var(--grey-500)]">Loading team...</p>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load team members. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-[var(--grey-900)]">Team</h1>

      {/* Invite form */}
      <div className="mb-6">
        <InviteForm
          availableRoles={CCC_ROLES}
          defaultRole="ccc_member"
          existingEmails={existingEmails}
          pendingEmails={pendingEmails}
          onInvite={handleInvite}
          isPending={createInvite.isPending}
          error={createInvite.error?.message ?? null}
          lastCreated={createInvite.data ?? null}
        />
      </div>

      {/* Two-column layout: members left (560px), invitations right */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Team members — left column */}
        <div className="flex flex-col gap-4 lg:w-[560px] lg:shrink-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--grey-500)]">
            Team Members ({members.length})
          </h2>

          {members.length === 0 ? (
            <div className="rounded-lg border border-[#E5E4E0] bg-white p-6">
              <p className="text-sm text-[var(--grey-500)]">No team members yet. Send an invite above.</p>
            </div>
          ) : (
            members.map((member) => (
              <UserCard
                key={member.id}
                member={member}
                currentUserId={currentUser?.id ?? ''}
                totalAdmins={totalAdmins}
                availableRoles={CCC_ROLES}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                roleChangeError={roleErrors[member.id] || null}
                removeError={removeErrors[member.id] || null}
                isUpdating={updateRole.isPending || removeUser.isPending}
              />
            ))
          )}
        </div>

        {/* Pending invitations — right column */}
        <div className="flex-1">
          {invitationsLoading ? (
            <p className="py-6 text-center text-sm text-[var(--grey-500)]">Loading invitations...</p>
          ) : (
            <PendingInvitations
              invitations={invitations}
              onResend={(id) => resendInvite.mutate(id)}
              onRevoke={(id) => revokeInvite.mutate(id)}
              isResending={resendInvite.isPending}
              isRevoking={revokeInvite.isPending}
              resendError={resendInvite.error?.message ?? null}
              revokeError={revokeInvite.error?.message ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
