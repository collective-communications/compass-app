import type { ReactElement } from 'react';
import { getTierFromRole } from '@compass/types';
import { useRequireAuth } from '../../../hooks/use-require-auth';
import { AdminHelp } from '../components/admin-help';
import { ClientHelp } from '../components/client-help';

export function HelpPage(): ReactElement {
  const user = useRequireAuth();

  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  const tier = getTierFromRole(user.role);
  return tier === 'tier_1' ? <AdminHelp /> : <ClientHelp />;
}
