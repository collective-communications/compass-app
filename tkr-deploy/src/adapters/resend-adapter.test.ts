import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ResendAdapter } from './resend-adapter.js';
import {
  ResendAuthError,
  ResendRateLimitError,
  ResendNotFoundError,
  ResendTimeoutError,
} from './resend-errors.js';

const API_KEY = 're_test_123';

interface MockFetchOptions {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function mockFetch(handler: (url: string, init?: RequestInit) => MockFetchOptions): void {
  globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const { status, body, headers } = handler(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  }) as typeof fetch;
}

function mockFetchError(error: Error): void {
  globalThis.fetch = mock(async () => {
    throw error;
  }) as typeof fetch;
}

describe('ResendAdapter', () => {
  const originalFetch = globalThis.fetch;
  let adapter: ResendAdapter;

  beforeEach(() => {
    adapter = new ResendAdapter({ apiKey: API_KEY });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('healthCheck', () => {
    it('returns healthy when /domains succeeds', async () => {
      mockFetch(() => ({ status: 200, body: { data: [] } }));
      const result = await adapter.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.provider).toBe('resend');
      expect(result.label).toBe('Resend');
    });

    it('returns down when /domains returns 401', async () => {
      mockFetch(() => ({ status: 401, body: { message: 'Invalid API key' } }));
      const result = await adapter.healthCheck();
      expect(result.status).toBe('down');
      expect(result.details.error).toContain('Invalid API key');
    });
  });

  describe('getDomains', () => {
    it('returns domain summaries', async () => {
      mockFetch(() => ({
        status: 200,
        body: {
          data: [
            { id: 'd_1', name: 'example.com', status: 'verified' },
            { id: 'd_2', name: 'test.com', status: 'pending' },
          ],
        },
      }));

      const domains = await adapter.getDomains();
      expect(domains).toHaveLength(2);
      expect(domains[0]).toEqual({ id: 'd_1', name: 'example.com', status: 'verified' });
    });
  });

  describe('getDomain', () => {
    it('returns domain detail with filtered DNS records', async () => {
      mockFetch(() => ({
        status: 200,
        body: {
          id: 'd_1',
          name: 'example.com',
          status: 'verified',
          region: 'us-east-1',
          created_at: '2024-01-01T00:00:00Z',
          records: [
            { record: 'SPF', name: 'example.com', type: 'TXT', value: 'v=spf1', status: 'verified', ttl: '3600' },
            { record: 'DKIM', name: 'resend._domainkey.example.com', type: 'CNAME', value: 'dkim.resend.dev', status: 'not_started', ttl: '3600' },
            { record: 'MX', name: 'example.com', type: 'MX', value: 'mx.resend.com', status: 'verified', ttl: '3600' },
          ],
        },
      }));

      const domain = await adapter.getDomain('d_1');
      expect(domain.id).toBe('d_1');
      expect(domain.records).toHaveLength(2); // MX filtered out
      expect(domain.records[0]).toEqual({
        type: 'TXT',
        name: 'example.com',
        value: 'v=spf1',
        status: 'verified',
      });
      expect(domain.records[1].type).toBe('CNAME');
    });
  });

  describe('addDomain', () => {
    it('creates a domain and returns id + records', async () => {
      mockFetch(() => ({
        status: 200,
        body: {
          id: 'd_new',
          records: [
            { record: 'SPF', name: 'new.com', type: 'TXT', value: 'v=spf1', status: 'not_started', ttl: '3600' },
          ],
        },
      }));

      const result = await adapter.addDomain('new.com');
      expect(result.id).toBe('d_new');
      expect(result.records).toHaveLength(1);
      expect(result.records[0].type).toBe('TXT');
    });
  });

  describe('verifyDomain', () => {
    it('calls verify endpoint without error', async () => {
      mockFetch(() => ({ status: 200, body: {} }));
      await expect(adapter.verifyDomain('d_1')).resolves.toBeUndefined();
    });
  });

  describe('getSendingStats', () => {
    it('returns stats with limit and remaining', async () => {
      mockFetch(() => ({
        status: 200,
        body: { data: { sent: 150 } },
      }));

      const stats = await adapter.getSendingStats();
      expect(stats.sent).toBe(150);
      expect(stats.limit).toBe(3000);
      expect(stats.remaining).toBe(2850);
    });
  });

  describe('getApiKeys', () => {
    it('maps API keys from snake_case to camelCase', async () => {
      mockFetch(() => ({
        status: 200,
        body: {
          data: [
            { id: 'k_1', name: 'My Key', created_at: '2024-01-01T00:00:00Z', permission: 'full_access', domain_id: null },
          ],
        },
      }));

      const keys = await adapter.getApiKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toEqual({
        id: 'k_1',
        name: 'My Key',
        createdAt: '2024-01-01T00:00:00Z',
        permission: 'full_access',
        domainId: null,
      });
    });
  });

  describe('error handling', () => {
    it('throws ResendAuthError on 401', async () => {
      mockFetch(() => ({ status: 401, body: { message: 'Invalid API key' } }));
      await expect(adapter.getDomains()).rejects.toBeInstanceOf(ResendAuthError);
    });

    it('throws ResendRateLimitError on 429 with retryAfterMs', async () => {
      mockFetch(() => ({
        status: 429,
        body: { message: 'Too many requests' },
        headers: { 'Retry-After': '30' },
      }));

      try {
        await adapter.getDomains();
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResendRateLimitError);
        expect((error as ResendRateLimitError).retryAfterMs).toBe(30000);
      }
    });

    it('throws ResendNotFoundError on 404', async () => {
      mockFetch(() => ({ status: 404, body: { message: 'Domain not found' } }));
      await expect(adapter.getDomain('missing')).rejects.toBeInstanceOf(ResendNotFoundError);
    });

    it('throws ResendTimeoutError on timeout', async () => {
      const timeoutAdapter = new ResendAdapter({ apiKey: API_KEY, timeoutMs: 10 });
      mockFetchError(new DOMException('The operation was aborted', 'TimeoutError'));
      await expect(timeoutAdapter.getDomains()).rejects.toBeInstanceOf(ResendTimeoutError);
    });
  });

  describe('request headers', () => {
    it('sends Authorization header with Bearer token', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(
          Object.entries(init?.headers ?? {}),
        );
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }) as typeof fetch;

      await adapter.getDomains();
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${API_KEY}`);
    });
  });
});
