import type { ProviderAdapter, ProviderHealth } from '../types/provider.js';
import type { DnsRecord, ResendDomain, ApiKeyMeta } from '../types/resend.js';
import {
  ResendApiError,
  ResendTimeoutError,
} from './resend-errors.js';

export interface ResendAdapterConfig {
  apiKey: string;
  timeoutMs?: number;
}

interface ResendSendingStats {
  sent: number;
  limit: number;
  remaining: number;
}

const BASE_URL = 'https://api.resend.com';
const DEFAULT_TIMEOUT_MS = 10_000;
const FREE_TIER_LIMIT = 3000;

export class ResendAdapter implements ProviderAdapter {
  readonly name = 'resend' as const;

  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: ResendAdapterConfig) {
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = Date.now();
    try {
      await this.request('GET', '/domains');
      return {
        provider: this.name,
        status: 'healthy',
        label: 'Resend',
        details: {},
        checkedAt,
      };
    } catch (error: unknown) {
      return {
        provider: this.name,
        status: 'down',
        label: 'Resend',
        details: { error: error instanceof Error ? error.message : String(error) },
        checkedAt,
      };
    }
  }

  async getDomains(): Promise<Array<{ id: string; name: string; status: string }>> {
    const body = await this.request<{ data: Array<{ id: string; name: string; status: string }> }>(
      'GET',
      '/domains',
    );
    return body.data.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
    }));
  }

  async getDomain(id: string): Promise<ResendDomain> {
    const body = await this.request<{
      id: string;
      name: string;
      status: string;
      region: string;
      created_at: string;
      records: Array<{
        record: string;
        name: string;
        type: string;
        value: string;
        status: string;
        ttl: string;
      }>;
    }>('GET', `/domains/${id}`);

    const records: DnsRecord[] = body.records
      .filter((r) => r.record !== 'MX')
      .map((r) => ({
        type: r.record === 'SPF' ? 'TXT' as const : 'CNAME' as const,
        name: r.name,
        value: r.value,
        status: r.status === 'verified' ? 'verified' as const : 'not_started' as const,
      }));

    return {
      id: body.id,
      name: body.name,
      status: body.status as ResendDomain['status'],
      region: body.region,
      createdAt: body.created_at,
      records,
    };
  }

  async addDomain(name: string): Promise<{ id: string; records: DnsRecord[] }> {
    const body = await this.request<{
      id: string;
      records: Array<{
        record: string;
        name: string;
        type: string;
        value: string;
        status: string;
        ttl: string;
      }>;
    }>('POST', '/domains', { name });

    const records: DnsRecord[] = body.records
      .filter((r) => r.record !== 'MX')
      .map((r) => ({
        type: r.record === 'SPF' ? 'TXT' as const : 'CNAME' as const,
        name: r.name,
        value: r.value,
        status: r.status === 'verified' ? 'verified' as const : 'not_started' as const,
      }));

    return { id: body.id, records };
  }

  async verifyDomain(id: string): Promise<void> {
    await this.request('POST', `/domains/${id}/verify`);
  }

  async getSendingStats(month?: string): Promise<ResendSendingStats> {
    const params = month ? `?month=${month}` : '';
    const body = await this.request<{ data: { sent: number } }>('GET', `/emails${params}`);
    const sent = body.data?.sent ?? 0;
    return {
      sent,
      limit: FREE_TIER_LIMIT,
      remaining: Math.max(0, FREE_TIER_LIMIT - sent),
    };
  }

  async getApiKeys(): Promise<ApiKeyMeta[]> {
    const body = await this.request<{
      data: Array<{
        id: string;
        name: string;
        created_at: string;
        permission: string;
        domain_id: string | null;
      }>;
    }>('GET', '/api-keys');

    return body.data.map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.created_at,
      permission: k.permission as ApiKeyMeta['permission'],
      domainId: k.domain_id,
    }));
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ResendTimeoutError(this.timeoutMs);
      }
      throw error;
    }

    if (!response.ok) {
      throw await ResendApiError.fromResponse(response);
    }

    return response.json() as Promise<T>;
  }
}
