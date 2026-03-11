import type { VaultClient, VaultStatus } from '../../types/vault.js';

export interface MockVaultClientOptions {
  locked?: boolean;
  connected?: boolean;
  secrets?: Record<string, string>;
}

/**
 * In-memory VaultClient for testing.
 * Supports lock/unlock/disconnect/reconnect to simulate vault states.
 */
export class MockVaultClient implements VaultClient {
  private _locked: boolean;
  private _connected: boolean;
  private readonly _secrets: Map<string, string>;

  constructor(opts?: MockVaultClientOptions) {
    this._locked = opts?.locked ?? false;
    this._connected = opts?.connected ?? true;
    this._secrets = new Map(Object.entries(opts?.secrets ?? {}));
  }

  lock(): void {
    this._locked = true;
  }

  unlock(): void {
    this._locked = false;
  }

  disconnect(): void {
    this._connected = false;
  }

  reconnect(): void {
    this._connected = true;
  }

  async health(): Promise<{ connected: boolean; locked: boolean; name: string }> {
    return { connected: this._connected, locked: this._locked, name: 'mock-vault' };
  }

  async listSecrets(): Promise<string[]> {
    this.assertReady();
    return Array.from(this._secrets.keys());
  }

  async getSecret(name: string): Promise<string> {
    this.assertReady();
    const value = this._secrets.get(name);
    if (value === undefined) {
      throw new Error(`Secret not found: ${name}`);
    }
    return value;
  }

  async getAll(): Promise<Map<string, string>> {
    this.assertReady();
    return new Map(this._secrets);
  }

  async getStatus(): Promise<VaultStatus> {
    return {
      connected: this._connected,
      locked: this._locked,
      name: 'mock-vault',
      secretCount: this._secrets.size,
    };
  }

  private assertReady(): void {
    if (!this._connected) {
      throw new Error('Vault is offline');
    }
    if (this._locked) {
      throw new Error('Vault is locked');
    }
  }
}
