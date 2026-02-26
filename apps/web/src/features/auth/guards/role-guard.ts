import type { UserRole } from '@compass/types';

/** Check whether a role is in the allowed set */
export function isRoleAllowed(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(role);
}
