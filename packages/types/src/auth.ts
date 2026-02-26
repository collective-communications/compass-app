/** Platform user roles — maps to user_role Postgres enum */
export const UserRole = {
  CCC_ADMIN: 'ccc_admin',
  CCC_MEMBER: 'ccc_member',
  CLIENT_EXEC: 'client_exec',
  CLIENT_DIRECTOR: 'client_director',
  CLIENT_MANAGER: 'client_manager',
  CLIENT_USER: 'client_user',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Tier classification derived from role */
export type UserTier = 'tier_1' | 'tier_2';

/** Authenticated user with platform context */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  organizationId: string | null;
  tier: UserTier;
}

/** Session state for auth store */
export interface SessionContext {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

/**
 * Derive tier from role.
 * tier_1 = CC+C team, tier_2 = client users
 */
export function getTierFromRole(role: UserRole): UserTier {
  return role === UserRole.CCC_ADMIN || role === UserRole.CCC_MEMBER
    ? 'tier_1'
    : 'tier_2';
}

/**
 * Get the home route for a tier.
 */
export function getTierHomeRoute(tier: UserTier): string {
  return tier === 'tier_1' ? '/admin/surveys' : '/dashboard';
}
