export class VaultOfflineError extends Error {
  readonly code = 'VAULT_OFFLINE' as const;
  constructor(vaultName: string) {
    super(`Vault "${vaultName}" is offline`);
    this.name = 'VaultOfflineError';
  }
}

export class VaultLockedError extends Error {
  readonly code = 'VAULT_LOCKED' as const;
  constructor(vaultName: string) {
    super(`Vault "${vaultName}" is locked`);
    this.name = 'VaultLockedError';
  }
}

export class SecretNotFoundError extends Error {
  readonly code = 'SECRET_NOT_FOUND' as const;
  readonly secretName: string;
  constructor(secretName: string) {
    super(`Secret "${secretName}" not found`);
    this.name = 'SecretNotFoundError';
    this.secretName = secretName;
  }
}

export class VaultTimeoutError extends Error {
  readonly code = 'VAULT_TIMEOUT' as const;
  constructor(vaultName: string, timeoutMs: number) {
    super(`Vault "${vaultName}" request timed out after ${timeoutMs}ms`);
    this.name = 'VaultTimeoutError';
  }
}

export class VaultProtocolError extends Error {
  readonly code = 'VAULT_PROTOCOL' as const;
  readonly statusCode: number;
  constructor(statusCode: number, message?: string) {
    super(message ?? `Vault returned unexpected status ${statusCode}`);
    this.name = 'VaultProtocolError';
    this.statusCode = statusCode;
  }
}
