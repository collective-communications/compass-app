/** Re-export shim — implementation lives in `@compass/sdk`. */
export {
  listTeamMembers,
  listClientUsers,
  listInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  updateUserRole,
  removeUser,
} from '@compass/sdk';
export type {
  CccRole,
  ClientRole,
  TeamMember,
  Invitation,
  InviteParams,
  UpdateRoleParams,
} from '@compass/sdk';
