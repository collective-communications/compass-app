/** Query key factory for client access queries */
export const clientAccessKeys = {
  all: ['client-access'] as const,
  org: (orgId: string) => [...clientAccessKeys.all, orgId] as const,
};
