/**
 * Users tab for the client detail page.
 * Route: /clients/:orgId (Users tab)
 * Manages client_exec, client_director, client_manager roles for an organization.
 * Two-column desktop layout matching the CC+C team page pattern.
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import { useAuthStore } from '../../../../stores/auth-store';
import {
  useClientUsers,
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateRole,
  useRemoveUser,
} from '../../users/hooks/use-team-members';
import { UserCard } from '../../users/components/user-card';
import { InviteForm } from '../../users/components/invite-form';
import { PendingInvitations } from '../../users/components/pending-invitations';
import type { CccRole, ClientRole } from '../../users/services/user-service';

export interface ClientUsersTabProps {
  organizationId: string;
}

const CLIENT_ROLES = [
  { value: 'client_exec', label: 'Executive' },
  { value: 'client_director', label: 'Director' },
  { value: 'client_manager', label: 'Manager' },
] as const;

export function ClientUsersTab({ organizationId }: ClientUsersTabProps): ReactElement {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [], isLoading: membersLoading, error: membersError } = useClientUsers(organizationId);
  const { data: invitations = [], isLoading: invitationsLoading } = useInvitations(organizationId);

  const createInvite = useCreateInvitation(organizationId);
  const resendInvite = useResendInvitation(organizationId);
  const revokeInvite = useRevokeInvitation(organizationId);
  const updateRole = useUpdateRole(organizationId);
  const removeUser = useRemoveUser(organizationId);

  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});

  const existingEmails = useMemo(() => members.map((m) => m.email.toLowerCase()), [members]);
  const pendingEmails = useMemo(() => invitations.map((i) => i.email.toLowerCase()), [invitations]);

  const handleRoleChange = useCallback(
    (userId: string, role: CccRole | ClientRole): void => {
      setRoleErrors((prev) => ({ ...prev, [userId]: '' }));
      updateRole.mutate(
        { userId, role, organizationId },
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
    [organizationId, updateRole],
  );

  const handleRemove = useCallback(
    (userId: string): void => {
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
    [removeUser],
  );

  const handleInvite = useCallback(
    (email: string, role: CccRole | ClientRole): void => {
      createInvite.mutate({ email, role, organizationId });
    },
    [createInvite, organizationId],
  );

  if (membersLoading) {
    return (
      <div role="tabpanel" id="client-detail-panel-users" aria-labelledby="client-detail-users">
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading users...</p>
      </div>
    );
  }

  if (membersError) {
    return (
      <div role="tabpanel" id="client-detail-panel-users" aria-labelledby="client-detail-users">
        <div className="rounded-lg border border-[var(--feedback-error-border)] bg-[var(--feedback-error-bg)] p-4 text-sm text-[var(--feedback-error-text)]" role="alert">
          Failed to load client users. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id="client-detail-panel-users" aria-labelledby="client-detail-users">
      {/* Invite form */}
      <div className="mb-6">
        <InviteForm
          availableRoles={CLIENT_ROLES}
          defaultRole="client_manager"
          existingEmails={existingEmails}
          pendingEmails={pendingEmails}
          onInvite={handleInvite}
          isPending={createInvite.isPending}
          error={createInvite.error?.message ?? null}
          lastCreated={createInvite.data ?? null}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Users — left column */}
        <div className="flex flex-col gap-4 lg:w-[560px] lg:shrink-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Client Users ({members.length})
          </h2>

          {members.length === 0 ? (
            <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
              <p className="text-sm text-[var(--text-secondary)]">No users assigned to this client. Send an invite above.</p>
            </div>
          ) : (
            members.map((member) => (
              <UserCard
                key={member.id}
                member={member}
                currentUserId={currentUser?.id ?? ''}
                totalAdmins={0}
                availableRoles={CLIENT_ROLES}
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
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Loading invitations...</p>
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
