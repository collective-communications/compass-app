/**
 * VaultStatus — topbar link that shows the vault lock state.
 *
 * Matches the legacy shell anchor: same `.shell-topbar__vault-status` class,
 * same `localhost:42042` target, same "Vault: <label>" copy.
 *
 * @module shell/VaultStatus
 */

import type { JSX } from 'preact';
import { vault$ } from '../stores/vault.js';
import { StatusDot } from '../components/StatusDot.js';

const VAULT_HREF = 'http://localhost:42042';

export function VaultStatus(): JSX.Element {
  const { status, label } = vault$.value;
  return (
    <a
      class="shell-topbar__vault-status"
      href={VAULT_HREF}
      target="_blank"
      rel="noopener noreferrer"
    >
      <StatusDot status={status} label={`Vault: ${label}`} />
    </a>
  );
}
