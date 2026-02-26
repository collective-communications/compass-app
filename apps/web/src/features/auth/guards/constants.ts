import { UserRole } from '@compass/types';

/** Roles allowed to access the /clients admin area (tier 1) */
export const CLIENTS_ALLOWED_ROLES: readonly UserRole[] = [
  UserRole.CCC_ADMIN,
  UserRole.CCC_MEMBER,
] as const;

/** Roles allowed to access the /dashboard client area (tier 2) */
export const DASHBOARD_ALLOWED_ROLES: readonly UserRole[] = [
  UserRole.CLIENT_EXEC,
  UserRole.CLIENT_DIRECTOR,
  UserRole.CLIENT_MANAGER,
  UserRole.CLIENT_USER,
] as const;
