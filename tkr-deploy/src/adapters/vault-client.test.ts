import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { VaultHttpClient } from './vault-client.js';
import {
  VaultOfflineError,
  VaultLockedError,
  SecretNotFoundError,
  VaultTimeoutError,
} from './vault-errors.js';

const BASE_URL = 'http://localhost:42042';
const VAULT_NAME = 'test-vault';

function mockFetch(handler: (url: string) => { status: number; body: unknown }): void {
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const { status, body } = handler(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function mockFetchError(error: Error): void {
  globalThis.fetch = mock(async () => {
    throw error;
  }) as unknown as typeof fetch;
}

describe('VaultHttpClient', () => {
  const originalFetch = globalThis.fetch;
  let client: VaultHttpClient;

  beforeEach(() => {
    client = new VaultHttpClient({ baseUrl: BASE_URL, vaultName: VAULT_NAME });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('health() returns connected+unlocked on 200 with locked:false', async () => {
    mockFetch(() => ({ status: 200, body: { success: true, data: { unlocked: true, secretCount: 3 } } }));
    const result = await client.health();
    expect(result).toEqual({ connected: true, locked: false, name: VAULT_NAME });
  });

  it('health() returns connected+locked on 200 with locked:true', async () => {
    mockFetch(() => ({ status: 200, body: { success: true, data: { unlocked: false, secretCount: 0 } } }));
    const result = await client.health();
    expect(result).toEqual({ connected: true, locked: true, name: VAULT_NAME });
  });

  it('health() returns offline on TypeError', async () => {
    mockFetchError(new TypeError('fetch failed'));
    const result = await client.health();
    expect(result).toEqual({ connected: false, locked: true, name: VAULT_NAME });
  });

  it('listSecrets() returns secret names', async () => {
    const secrets = ['DB_URL', 'API_KEY', 'JWT_SECRET'];
    mockFetch(() => ({ status: 200, body: { success: true, data: { order: secrets } } }));
    const result = await client.listSecrets();
    expect(result).toEqual(secrets);
  });

  it('listSecrets() throws VaultLockedError on 423', async () => {
    mockFetch(() => ({ status: 423, body: { error: 'locked' } }));
    await expect(client.listSecrets()).rejects.toBeInstanceOf(VaultLockedError);
  });

  it('getSecret() returns the secret value', async () => {
    mockFetch(() => ({ status: 200, body: { success: true, data: { value: 'super-secret-123' } } }));
    const result = await client.getSecret('API_KEY');
    expect(result).toBe('super-secret-123');
  });

  it('getSecret() throws SecretNotFoundError on 404', async () => {
    mockFetch(() => ({ status: 404, body: { error: 'not found' } }));
    await expect(client.getSecret('MISSING')).rejects.toBeInstanceOf(SecretNotFoundError);
  });

  it('getAll() aggregates all secrets into a Map', async () => {
    const secrets: Record<string, string> = { DB_URL: 'postgres://...', API_KEY: 'key-123' };
    let callCount = 0;
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/secrets')) {
        return new Response(JSON.stringify({ success: true, data: { order: Object.keys(secrets) } }), { status: 200 });
      }
      const name = url.split('/secrets/')[1]!;
      callCount++;
      return new Response(JSON.stringify({ success: true, data: { value: secrets[name] } }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await client.getAll();
    expect(result).toBeInstanceOf(Map);
    expect(result.get('DB_URL')).toBe('postgres://...');
    expect(result.get('API_KEY')).toBe('key-123');
    expect(callCount).toBe(2);
  });

  it('throws VaultTimeoutError on timeout', async () => {
    const timeoutClient = new VaultHttpClient({
      baseUrl: BASE_URL,
      vaultName: VAULT_NAME,
      timeoutMs: 10,
    });
    const err = new DOMException('The operation was aborted', 'TimeoutError');
    mockFetchError(err);
    await expect(timeoutClient.listSecrets()).rejects.toBeInstanceOf(VaultTimeoutError);
  });

  it('constructs correct URL paths', async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);
      return new Response(JSON.stringify({ success: true, data: { unlocked: true, secretCount: 0 } }), { status: 200 });
    }) as unknown as typeof fetch;

    await client.health();
    expect(urls[0]).toBe(`${BASE_URL}/api/vaults/${VAULT_NAME}/status`);

    urls.length = 0;
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);
      return new Response(JSON.stringify({ success: true, data: { order: [] } }), { status: 200 });
    }) as unknown as typeof fetch;
    await client.listSecrets();
    expect(urls[0]).toBe(`${BASE_URL}/api/vaults/${VAULT_NAME}/secrets`);

    urls.length = 0;
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);
      return new Response(JSON.stringify({ success: true, data: { value: 'v' } }), { status: 200 });
    }) as unknown as typeof fetch;
    await client.getSecret('MY_SECRET');
    expect(urls[0]).toBe(`${BASE_URL}/api/vaults/${VAULT_NAME}/secrets/MY_SECRET`);
  });
});
