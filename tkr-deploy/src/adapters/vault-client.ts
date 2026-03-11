import type { VaultClient, VaultStatus } from '../types/vault.js';
import {
  VaultOfflineError,
  VaultLockedError,
  SecretNotFoundError,
  VaultTimeoutError,
  VaultProtocolError,
} from './vault-errors.js';

export interface VaultHttpClientOptions {
  baseUrl?: string;
  vaultName: string;
  timeoutMs?: number;
}

export class VaultHttpClient implements VaultClient {
  private readonly baseUrl: string;
  private readonly vaultName: string;
  private readonly timeoutMs: number;

  constructor(options: VaultHttpClientOptions) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:42042';
    this.vaultName = options.vaultName;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private get vaultPath(): string {
    return `${this.baseUrl}/api/vaults/${this.vaultName}`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof TypeError) {
        throw new VaultOfflineError(this.vaultName);
      }
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new VaultTimeoutError(this.vaultName, this.timeoutMs);
      }
      throw error;
    }

    if (response.status === 404) {
      throw new SecretNotFoundError(url.split('/secrets/')[1] ?? 'unknown');
    }
    if (response.status === 423) {
      throw new VaultLockedError(this.vaultName);
    }
    if (!response.ok) {
      throw new VaultProtocolError(response.status);
    }

    return response.json() as Promise<T>;
  }

  async health(): Promise<{ connected: boolean; locked: boolean; name: string }> {
    try {
      const body = await this.fetchJson<{ success: boolean; data: { unlocked: boolean; secretCount: number } }>(
        `${this.vaultPath}/status`,
      );
      return { connected: true, locked: !body.data.unlocked, name: this.vaultName };
    } catch (error: unknown) {
      if (error instanceof VaultOfflineError) {
        return { connected: false, locked: true, name: this.vaultName };
      }
      throw error;
    }
  }

  async getStatus(): Promise<VaultStatus> {
    const body = await this.fetchJson<{ success: boolean; data: { unlocked: boolean; secretCount: number } }>(
      `${this.vaultPath}/status`,
    );
    return {
      connected: true,
      locked: !body.data.unlocked,
      name: this.vaultName,
      secretCount: body.data.secretCount,
    };
  }

  async listSecrets(): Promise<string[]> {
    const body = await this.fetchJson<{ success: boolean; data: { order: string[] } }>(
      `${this.vaultPath}/secrets`,
    );
    return body.data.order;
  }

  async getSecret(name: string): Promise<string> {
    const body = await this.fetchJson<{ success: boolean; data: { value: string } }>(
      `${this.vaultPath}/secrets/${name}`,
    );
    return body.data.value;
  }

  async getAll(): Promise<Map<string, string>> {
    const names = await this.listSecrets();
    const entries = await Promise.all(
      names.map(async (name): Promise<[string, string]> => [name, await this.getSecret(name)]),
    );
    return new Map(entries);
  }
}
