import type { ResendAdapter } from '../../adapters/resend-adapter.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

export function registerEmailRoutes(
  router: Router,
  resend: ResendAdapter,
): void {
  router.get('/api/email/domain', async () => {
    const domains = await resend.getDomains();
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
      // Fall back to first domain
      const domains = await resend.getDomains();
      if (domains.length === 0) {
        return jsonError('No domains configured', 404);
      }
      await resend.verifyDomain(domains[0].id);
      return jsonSuccess({ verified: domains[0].id });
    }

    await resend.verifyDomain(body.id);
    return jsonSuccess({ verified: body.id });
  });

  router.get('/api/email/stats', async () => {
    const stats = await resend.getSendingStats();
    return jsonSuccess(stats);
  });

  router.get('/api/email/keys', async () => {
    const keys = await resend.getApiKeys();
    return jsonSuccess(keys);
  });
}
