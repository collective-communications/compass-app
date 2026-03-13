import type { ResendAdapter } from './adapter.js';
import type { Router } from '../../src/api/router.js';
import { jsonSuccess, jsonError } from '../../src/api/router.js';

// ── Rate-limit-safe cache (Resend allows 2 req/sec) ──

interface CacheEntry<T> { data: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 30_000; // 30s

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expires) return entry.data;
  const data = await fn();
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

export function registerEmailRoutes(
  router: Router,
  resend: ResendAdapter,
): void {
  router.get('/api/email/domain', async () => {
    let domains;
    try {
      domains = await cached('domains', () => resend.getDomains());
    } catch {
      return jsonSuccess({ error: 'Resend API unavailable — check vault/token' });
    }
    const first = domains[0] ?? null;
    if (!first) {
      return jsonError('No domains configured', 404);
    }
    return jsonSuccess(first);
  });

  router.post('/api/email/domain/verify', async (req) => {
    let body: { id?: string } | undefined;
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    if (!body?.id) {
      const domains = await cached('domains', () => resend.getDomains());
      if (domains.length === 0) {
        return jsonError('No domains configured', 404);
      }
      await resend.verifyDomain(domains[0].id);
      cache.delete('domains'); // bust cache after verify
      return jsonSuccess({ verified: domains[0].id });
    }

    await resend.verifyDomain(body.id);
    cache.delete('domains');
    return jsonSuccess({ verified: body.id });
  });

  router.get('/api/email/dns', async () => {
    const domains = await cached('domains', () => resend.getDomains());
    const first = domains[0];
    if (!first) {
      return jsonSuccess([]);
    }
    const detail = await cached(`domain:${first.id}`, () => resend.getDomain(first.id));
    return jsonSuccess(detail.records);
  });

  router.get('/api/email/stats', async () => {
    try {
      const stats = await cached('stats', () => resend.getSendingStats());
      return jsonSuccess(stats);
    } catch {
      return jsonSuccess({ sent: 0, limit: 0, remaining: 0, error: 'Resend API unavailable — check vault/token' });
    }
  });

  router.get('/api/email/keys', async () => {
    try {
      const keys = await cached('keys', () => resend.getApiKeys());
      return jsonSuccess(keys);
    } catch {
      return jsonSuccess([]);
    }
  });
}
